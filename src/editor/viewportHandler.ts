/**
 * Viewport Handler
 * Manages zoom, pan, auto-scroll, and world sizing
 */

import { Domain, Module, Port, System, NumberedDot, Tag, type DiagramElement, type Point } from '../canvas/index';
import {
    type EditorState,
    EDGE_THRESHOLD,
    EXTEND_AMOUNT,
    MIN_SCALE,
    MAX_SCALE,
    ZOOM_SENSITIVITY,
    AUTO_SCROLL_EDGE_MARGIN,
    AUTO_SCROLL_SPEED
} from './editorState';

export function screenToWorld(state: EditorState, screenX: number, screenY: number): Point {
    return {
        x: (screenX - state.panOffset.x) / state.scale,
        y: (screenY - state.panOffset.y) / state.scale
    };
}

export function worldToScreen(state: EditorState, worldX: number, worldY: number): Point {
    return {
        x: worldX * state.scale + state.panOffset.x,
        y: worldY * state.scale + state.panOffset.y
    };
}

export function getMousePosition(state: EditorState, e: MouseEvent): Point {
    const rect = state.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return screenToWorld(state, screenX, screenY);
}

export function updateWorldSize(state: EditorState): void {
    const containerRect = state.container.getBoundingClientRect();
    const minWidth = containerRect.width;
    const minHeight = containerRect.height;

    let requiredWidth = minWidth;
    let requiredHeight = minHeight;

    for (const element of state.elements) {
        const rightEdge = element.x + element.width + EXTEND_AMOUNT;
        const bottomEdge = element.y + element.height + EXTEND_AMOUNT;
        requiredWidth = Math.max(requiredWidth, rightEdge);
        requiredHeight = Math.max(requiredHeight, bottomEdge);
    }

    state.worldWidth = Math.ceil(requiredWidth / state.gridSize) * state.gridSize;
    state.worldHeight = Math.ceil(requiredHeight / state.gridSize) * state.gridSize;

    state.canvasWorld.style.width = `${state.worldWidth}px`;
    state.canvasWorld.style.height = `${state.worldHeight}px`;
    state.canvas.style.width = `${state.worldWidth}px`;
    state.canvas.style.height = `${state.worldHeight}px`;

    const dpr = window.devicePixelRatio || 1;
    state.canvas.width = state.worldWidth * dpr;
    state.canvas.height = state.worldHeight * dpr;
    state.ctx.scale(dpr, dpr);
}

export function checkAndExtendWorld(state: EditorState, x: number, y: number): boolean {
    let extended = false;

    if (x > state.worldWidth - EDGE_THRESHOLD) {
        state.worldWidth += EXTEND_AMOUNT;
        extended = true;
    }
    if (y > state.worldHeight - EDGE_THRESHOLD) {
        state.worldHeight += EXTEND_AMOUNT;
        extended = true;
    }

    if (extended) {
        state.worldWidth = Math.ceil(state.worldWidth / state.gridSize) * state.gridSize;
        state.worldHeight = Math.ceil(state.worldHeight / state.gridSize) * state.gridSize;

        state.canvasWorld.style.width = `${state.worldWidth}px`;
        state.canvasWorld.style.height = `${state.worldHeight}px`;
        state.canvas.style.width = `${state.worldWidth}px`;
        state.canvas.style.height = `${state.worldHeight}px`;

        const dpr = window.devicePixelRatio || 1;
        state.canvas.width = state.worldWidth * dpr;
        state.canvas.height = state.worldHeight * dpr;
        state.ctx.scale(dpr, dpr);
    }

    return extended;
}

export function handleWheel(state: EditorState, e: WheelEvent, render: () => void, saveToStorage: () => void): void {
    const k = state.mode.kind;
    if (k === 'dragging' || k === 'resizing' || k === 'connecting' || k === 'boxSelect' || k === 'slidingConnection') {
        e.preventDefault();
        return;
    }

    if (e.ctrlKey) {
        e.preventDefault();
        const rect = state.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldPosBefore = screenToWorld(state, mouseX, mouseY);
        const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
        state.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.scale * (1 + zoomDelta)));
        const worldPosAfter = screenToWorld(state, mouseX, mouseY);

        state.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * state.scale;
        state.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * state.scale;
        render();
        saveToStorage();
    } else {
        e.preventDefault();
        state.panOffset.x -= e.deltaX;
        state.panOffset.y -= e.deltaY;
        render();
        saveToStorage();
    }
}

export function calculateAutoScrollDelta(state: EditorState): Point {
    const rect = state.canvas.getBoundingClientRect();
    const mouseX = state.lastScreenMousePos.x;
    const mouseY = state.lastScreenMousePos.y;
    const margin = AUTO_SCROLL_EDGE_MARGIN;
    const speed = AUTO_SCROLL_SPEED;

    let dx = 0;
    let dy = 0;

    if (mouseX < rect.left + margin) {
        const distance = rect.left + margin - mouseX;
        dx = Math.min(speed, speed * (distance / margin));
    } else if (mouseX > rect.right - margin) {
        const distance = mouseX - (rect.right - margin);
        dx = -Math.min(speed, speed * (distance / margin));
    }

    if (mouseY < rect.top + margin) {
        const distance = rect.top + margin - mouseY;
        dy = Math.min(speed, speed * (distance / margin));
    } else if (mouseY > rect.bottom - margin) {
        const distance = mouseY - (rect.bottom - margin);
        dy = -Math.min(speed, speed * (distance / margin));
    }

    return { x: dx, y: dy };
}

export function startAutoScroll(
    state: EditorState,
    render: () => void,
    findContainerAtPoint: (x: number, y: number, exclude?: DiagramElement) => Module | Domain | null,
    findDomainAtPoint: (x: number, y: number, exclude?: DiagramElement) => Domain | null,
    findSystemAtPoint: (x: number, y: number, exclude?: DiagramElement) => System | null
): void {
    if (state.autoScrollAnimationId !== null) return;

    const tick = () => {
        const mode = state.mode;
        if (mode.kind !== 'dragging' && mode.kind !== 'boxSelect' && mode.kind !== 'connecting' && mode.kind !== 'movingConnectionPoint') {
            stopAutoScroll(state);
            return;
        }

        const delta = calculateAutoScrollDelta(state);

        if (delta.x !== 0 || delta.y !== 0) {
            state.panOffset.x += delta.x;
            state.panOffset.y += delta.y;

            if (mode.kind === 'dragging') {
                const draggedComponent = mode.component;
                const rect = state.canvas.getBoundingClientRect();
                const screenX = state.lastScreenMousePos.x - rect.left;
                const screenY = state.lastScreenMousePos.y - rect.top;
                const pos = screenToWorld(state, screenX, screenY);

                let newX = pos.x - mode.offset.x;
                let newY = pos.y - mode.offset.y;

                if (state.snapToGrid && !(draggedComponent instanceof NumberedDot) && !(draggedComponent instanceof Tag) && !(draggedComponent instanceof Port)) {
                    newX = Math.round(newX / state.gridSize) * state.gridSize;
                    newY = Math.round(newY / state.gridSize) * state.gridSize;
                }

                const dx = newX - draggedComponent.x;
                const dy = newY - draggedComponent.y;
                draggedComponent.moveTo(newX, newY);

                for (const comp of state.selectedElements) {
                    if (comp !== draggedComponent) {
                        const parentIsSelected = comp.parentId &&
                            state.selectedElements.some(s => s.id === comp.parentId);
                        if (!parentIsSelected) {
                            comp.moveBy(dx, dy);
                        }
                    }
                }

                const centerX = draggedComponent.x + draggedComponent.width / 2;
                const centerY = draggedComponent.y + draggedComponent.height / 2;

                if (draggedComponent instanceof System) {
                    state.potentialDropTarget = null;
                } else if (draggedComponent instanceof Domain) {
                    state.potentialDropTarget = findSystemAtPoint(centerX, centerY, draggedComponent);
                } else if (draggedComponent instanceof Module) {
                    state.potentialDropTarget = findDomainAtPoint(centerX, centerY, draggedComponent);
                } else {
                    state.potentialDropTarget = findContainerAtPoint(centerX, centerY, draggedComponent);
                }
            }

            if (mode.kind === 'boxSelect') {
                const worldDx = -delta.x / state.scale;
                const worldDy = -delta.y / state.scale;
                mode.current.x += worldDx;
                mode.current.y += worldDy;
            }

            render();
        }

        state.autoScrollAnimationId = requestAnimationFrame(tick);
    };

    state.autoScrollAnimationId = requestAnimationFrame(tick);
}

export function stopAutoScroll(state: EditorState): void {
    if (state.autoScrollAnimationId !== null) {
        cancelAnimationFrame(state.autoScrollAnimationId);
        state.autoScrollAnimationId = null;
    }
}
