/**
 * Mouse Move Handler
 * Handles the complex handleMouseMove logic
 */

import {
    Boundary,
    ContainerElement,
    Domain,
    Label,
    Module,
    Note,
    NumberedDot,
    Port,
    System,
    Tag,
    type ConnectionPoint,
    type DiagramElement
} from '../canvas/index';
import { isDragOperation, type EditorState } from './editorState';
import { getResizeCursor } from './cursorUtils';
import {
    calculateAutoScrollDelta,
    checkAndExtendWorld,
    getMousePosition,
    startAutoScroll,
    stopAutoScroll
} from './viewportHandler';
import {
    findComponentAtPoint,
    findContainerAtPoint,
    findDomainAtPoint,
    findSystemAtPoint,
    getSortedComponentsForRendering,
    isPointCoveredByHigherComponent,
    projectPointOnBorder
} from './selectionHandler';
import { updateSnappedPorts } from './dragDropHandler';

export function handleMouseMove(
    state: EditorState,
    e: MouseEvent,
    render: () => void,
    findContainerFn: (x: number, y: number, exclude?: DiagramElement) => Module | Domain | null,
    findDomainFn: (x: number, y: number, exclude?: DiagramElement) => Domain | null,
    findSystemFn: (x: number, y: number, exclude?: DiagramElement) => System | null
): void {
    const rect = state.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    state.lastScreenMousePos = { x: e.clientX, y: e.clientY };

    // Check if we need auto-scroll during drag operations
    if (isDragOperation(state)) {
        const delta = calculateAutoScrollDelta(state);
        if (delta.x !== 0 || delta.y !== 0) {
            startAutoScroll(state, render, findContainerFn, findDomainFn, findSystemFn);
        } else {
            stopAutoScroll(state);
        }
    }

    // Handle panning
    if (state.isPanning) {
        state.panOffset.x = screenX - state.panStart.x;
        state.panOffset.y = screenY - state.panStart.y;
        render();
        return;
    }

    const pos = getMousePosition(state, e);
    state.mousePos = pos;

    // Dispatch on the active interaction mode. Each drag-style mode owns its
    // own per-frame update and returns; hover detection below runs only when
    // idle.
    switch (state.mode.kind) {
        case 'boxSelect':
            state.mode.current = { x: pos.x, y: pos.y };
            state.canvas.style.cursor = 'crosshair';
            render();
            return;

        case 'slidingConnection':
            updateConnectionSlide(state, state.mode, pos.y);
            state.canvas.style.cursor = 'ns-resize';
            render();
            return;

        case 'movingControlPoint':
            if (state.mode.pointType === 'source') {
                state.mode.connection.customControlPoint1 = { x: pos.x, y: pos.y };
            } else {
                state.mode.connection.customControlPoint2 = { x: pos.x, y: pos.y };
            }
            state.canvas.style.cursor = 'move';
            render();
            return;

        case 'draggingAnchor': {
            const anchor = state.mode.connection.intermediateAnchors[state.mode.index];
            if (anchor) {
                const dx = pos.x - anchor.position.x;
                const dy = pos.y - anchor.position.y;
                anchor.position.x = pos.x;
                anchor.position.y = pos.y;
                anchor.handleIn.x += dx;
                anchor.handleIn.y += dy;
                anchor.handleOut.x += dx;
                anchor.handleOut.y += dy;
            }
            state.canvas.style.cursor = 'move';
            render();
            return;
        }

        case 'draggingAnchorHandle': {
            const anchor = state.mode.connection.intermediateAnchors[state.mode.index];
            if (anchor) {
                if (state.mode.handleType === 'in') {
                    anchor.handleIn.x = pos.x;
                    anchor.handleIn.y = pos.y;
                } else {
                    anchor.handleOut.x = pos.x;
                    anchor.handleOut.y = pos.y;
                }
            }
            state.canvas.style.cursor = 'move';
            render();
            return;
        }

        case 'movingConnectionPoint':
            updateHoverConnectionPoint(state, pos);
            if (state.hoverConnectionPoint) {
                const newPoint: ConnectionPoint = {
                    x: state.hoverConnectionPoint.point.x,
                    y: state.hoverConnectionPoint.point.y,
                    componentId: state.hoverConnectionPoint.componentId,
                    side: state.hoverConnectionPoint.side,
                    offset: state.hoverConnectionPoint.offset
                };
                if (state.mode.end === 'source') {
                    state.mode.connection.sourcePoint = newPoint;
                } else {
                    state.mode.connection.targetPoint = newPoint;
                }
            }
            state.canvas.style.cursor = 'crosshair';
            render();
            return;

        case 'connecting':
            updateHoverConnectionPoint(state, pos);
            state.canvas.style.cursor = 'crosshair';
            render();
            return;

        case 'resizing':
            if (state.selectedElements.length === 1) {
                const selectedComponent = state.selectedElements[0]!;
                let dx = pos.x - state.mode.startPos.x;
                let dy = pos.y - state.mode.startPos.y;

                if (state.snapToGrid) {
                    dx = Math.round(dx / state.gridSize) * state.gridSize;
                    if (!(selectedComponent instanceof Note)) {
                        dy = Math.round(dy / state.gridSize) * state.gridSize;
                    }
                }

                selectedComponent.x = state.mode.startBounds.x;
                selectedComponent.y = state.mode.startBounds.y;
                selectedComponent.width = state.mode.startBounds.width;
                selectedComponent.height = state.mode.startBounds.height;

                selectedComponent.resize(state.mode.handle, dx, dy);

                const rightEdge = selectedComponent.x + selectedComponent.width;
                const bottomEdge = selectedComponent.y + selectedComponent.height;
                checkAndExtendWorld(state, rightEdge, bottomEdge);
            }
            render();
            return;

        case 'dragging':
            updateDrag(state, state.mode, e, pos);
            render();
            return;

        case 'idle':
            break;
    }

    // ----- Idle: hover detection -----

    // Check for resize handle hover on selected component
    if (state.selectedElements.length === 1) {
        const selectedComponent = state.selectedElements[0]!;
        const handle = selectedComponent.getResizeHandleAtPoint(pos.x, pos.y);
        if (handle) {
            state.hoverConnectionPoint = null;
            state.canvas.style.cursor = getResizeCursor(handle);
            render();
            return;
        }
    }

    // Check for control point hover
    if (state.selectedConnection) {
        const controlPoint = state.selectedConnection.getControlPointAtPosition(pos.x, pos.y, state.elements);
        if (controlPoint) {
            state.canvas.style.cursor = 'move';
            render();
            return;
        }
    }

    // Check for border hover (connection point)
    state.hoverConnectionPoint = null;
    const sortedComponents = getSortedComponentsForRendering(state);
    for (let i = sortedComponents.length - 1; i >= 0; i--) {
        const component = sortedComponents[i]!;
        const borderPoint = component.getNearestBorderPoint(pos.x, pos.y);
        if (borderPoint) {
            if (!isPointCoveredByHigherComponent(state, borderPoint.point, component)) {
                // This hover path only runs while idle (not connecting), so a
                // Port border point should never surface as a start point here.
                if (component instanceof Port) break;
                state.hoverConnectionPoint = {
                    ...borderPoint,
                    componentId: component.id
                };
                state.canvas.style.cursor = 'crosshair';
                render();
                return;
            }
        }
    }

    // Hover detection
    const component = findComponentAtPoint(state, pos.x, pos.y);

    if (component !== state.hoveredElement) {
        if (state.hoveredElement) {
            state.hoveredElement.hovered = false;
        }
        if (component) {
            component.hovered = true;
            state.canvas.style.cursor = 'grab';
        } else {
            state.canvas.style.cursor = 'default';
        }
        state.hoveredElement = component;
    }

    render();
}

/** Narrowed mode payloads used by the per-frame update helpers. */
type SlidingConnectionMode = Extract<EditorState['mode'], { kind: 'slidingConnection' }>;
type DraggingMode = Extract<EditorState['mode'], { kind: 'dragging' }>;

/** Recompute state.hoverConnectionPoint from the first element whose border the cursor is near. */
function updateHoverConnectionPoint(state: EditorState, pos: { x: number; y: number }): void {
    state.hoverConnectionPoint = null;
    for (const component of state.elements) {
        const borderPoint = component.getNearestBorderPoint(pos.x, pos.y);
        if (borderPoint) {
            state.hoverConnectionPoint = { ...borderPoint, componentId: component.id };
            break;
        }
    }
}

/** Slide both endpoints of a connection vertically along their host borders. */
function updateConnectionSlide(state: EditorState, mode: SlidingConnectionMode, posY: number): void {
    const deltaY = posY - mode.startY;

    const sourceComp = state.elements.find(c => c.id === mode.sourceStart.componentId);
    const targetComp = state.elements.find(c => c.id === mode.targetStart.componentId);
    if (!sourceComp || !targetComp) return;

    const sourceOrig = sourceComp.getPointOnBorder(mode.sourceStart.side, mode.sourceStart.offset);
    const targetOrig = targetComp.getPointOnBorder(mode.targetStart.side, mode.targetStart.offset);

    const newSourceBorder = projectPointOnBorder(sourceComp, sourceOrig.x, sourceOrig.y + deltaY);
    const newTargetBorder = projectPointOnBorder(targetComp, targetOrig.x, targetOrig.y + deltaY);

    if (newSourceBorder) {
        mode.connection.sourcePoint = {
            ...mode.connection.sourcePoint,
            side: newSourceBorder.side,
            offset: newSourceBorder.offset
        };
    }
    if (newTargetBorder) {
        mode.connection.targetPoint = {
            ...mode.connection.targetPoint,
            side: newTargetBorder.side,
            offset: newTargetBorder.offset
        };
    }
}

/** Move the dragged element (and co-selected siblings), reflow attached connections, and track drop target. */
function updateDrag(state: EditorState, mode: DraggingMode, e: MouseEvent, pos: { x: number; y: number }): void {
    const draggedComponent = mode.component;
    let newX = pos.x - mode.offset.x;
    let newY = pos.y - mode.offset.y;

    if (state.snapToGrid && !(draggedComponent instanceof NumberedDot) && !(draggedComponent instanceof Tag) && !(draggedComponent instanceof Port)) {
        newX = Math.round(newX / state.gridSize) * state.gridSize;
        newY = Math.round(newY / state.gridSize) * state.gridSize;
    }

    // Shift key constrains movement to a single axis (horizontal or vertical)
    if (e.shiftKey && mode.startPos) {
        const absDx = Math.abs(newX - mode.startPos.x);
        const absDy = Math.abs(newY - mode.startPos.y);
        if (absDx >= absDy) {
            newY = mode.startPos.y;
        } else {
            newX = mode.startPos.x;
        }
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

    // Move intermediate anchors and control points for connections where both endpoints are being moved
    for (const connection of state.connections) {
        const sourceId = connection.sourcePoint.componentId;
        const targetId = connection.targetPoint.componentId;
        const sourceIsMoving = state.selectedElements.some(el => el.id === sourceId);
        const targetIsMoving = state.selectedElements.some(el => el.id === targetId);

        if (sourceIsMoving && targetIsMoving) {
            for (const anchor of connection.intermediateAnchors) {
                anchor.position.x += dx;
                anchor.position.y += dy;
                anchor.handleIn.x += dx;
                anchor.handleIn.y += dy;
                anchor.handleOut.x += dx;
                anchor.handleOut.y += dy;
            }
            if (connection.customControlPoint1) {
                connection.customControlPoint1.x += dx;
                connection.customControlPoint1.y += dy;
            }
            if (connection.customControlPoint2) {
                connection.customControlPoint2.x += dx;
                connection.customControlPoint2.y += dy;
            }
        } else if ((sourceIsMoving || targetIsMoving) && connection.intermediateAnchors.length > 0) {
            const count = connection.intermediateAnchors.length;
            for (let i = 0; i < count; i++) {
                const ratio = sourceIsMoving
                    ? (count - i) / (count + 1)
                    : (i + 1) / (count + 1);
                const anchor = connection.intermediateAnchors[i]!;
                anchor.position.x += dx * ratio;
                anchor.position.y += dy * ratio;
                anchor.handleIn.x += dx * ratio;
                anchor.handleIn.y += dy * ratio;
                anchor.handleOut.x += dx * ratio;
                anchor.handleOut.y += dy * ratio;
            }
            if (sourceIsMoving && connection.customControlPoint1) {
                connection.customControlPoint1.x += dx;
                connection.customControlPoint1.y += dy;
            }
            if (targetIsMoving && connection.customControlPoint2) {
                connection.customControlPoint2.x += dx;
                connection.customControlPoint2.y += dy;
            }
        }
    }

    // Reposition ports snapped to any of the moving elements (including all descendants of moving containers)
    const movingIds = new Set(state.selectedElements.map(el => el.id));
    const collectDescendants = (el: DiagramElement) => {
        if (el instanceof ContainerElement) {
            for (const child of el.children) {
                movingIds.add(child.id);
                collectDescendants(child);
            }
        }
    };
    for (const el of state.selectedElements) collectDescendants(el);
    updateSnappedPorts(state.elements, movingIds);

    const rightEdge = draggedComponent.x + draggedComponent.width;
    const bottomEdge = draggedComponent.y + draggedComponent.height;
    checkAndExtendWorld(state, rightEdge, bottomEdge);

    // Check for potential container drop target
    const centerX = draggedComponent.x + draggedComponent.width / 2;
    const centerY = draggedComponent.y + draggedComponent.height / 2;

    if (draggedComponent instanceof System) {
        state.potentialDropTarget = null;
    } else if (draggedComponent instanceof Boundary || draggedComponent instanceof Note || draggedComponent instanceof NumberedDot || draggedComponent instanceof Label || draggedComponent instanceof Tag) {
        state.potentialDropTarget = null;
    } else if (draggedComponent instanceof Domain) {
        state.potentialDropTarget = findSystemAtPoint(state, centerX, centerY, draggedComponent);
    } else if (draggedComponent instanceof Module) {
        state.potentialDropTarget = findDomainAtPoint(state, centerX, centerY, draggedComponent);
    } else {
        state.potentialDropTarget = findContainerAtPoint(state, centerX, centerY, draggedComponent);
    }
}
