/**
 * Mouse Up Handler
 * Handles mouseUp event: completing drags, selections, connections, and resizes
 */

import {
    Boundary,
    Connection,
    Domain,
    Label,
    Module,
    Note,
    NumberedDot,
    Port,
    System,
    Tag,
    type ConnectionPoint,
    type DiagramElement,
    type Point
} from '../canvas/index';
import type { EditorState } from './editorState';
import { IDLE } from './interactionMode';
import { screenToWorld, stopAutoScroll } from './viewportHandler';
import { selectElement } from './selectionHandler';
import { resolveOverlapInContainer, resolveOverlapAtLevel, snapPortToBorder } from './dragDropHandler';

export interface MouseUpCallbacks {
    render: () => void;
    saveState: () => void;
    saveToStorage: () => void;
}

export function handleMouseUp(state: EditorState, callbacks: MouseUpCallbacks): void {
    stopAutoScroll(state);

    if (state.isPanning) {
        state.isPanning = false;
        state.canvas.style.cursor = state.isSpacePressed ? 'grab' : 'default';
        callbacks.saveToStorage();
        return;
    }

    let changed = false;
    const mode = state.mode;

    switch (mode.kind) {
        case 'idle':
            break;

        case 'boxSelect':
            completeBoxSelection(state, mode.start, mode.current);
            state.mode = IDLE;
            callbacks.render();
            break;

        case 'slidingConnection':
            state.mode = IDLE;
            state.canvas.style.cursor = 'default';
            callbacks.render();
            changed = true;
            break;

        case 'movingControlPoint':
            state.mode = IDLE;
            state.canvas.style.cursor = 'default';
            callbacks.render();
            changed = true;
            break;

        case 'draggingAnchor':
        case 'draggingAnchorHandle':
            state.mode = IDLE;
            state.canvas.style.cursor = 'default';
            callbacks.render();
            changed = true;
            break;

        case 'movingConnectionPoint':
            if (state.hoverConnectionPoint) {
                const newPoint: ConnectionPoint = {
                    x: state.hoverConnectionPoint.point.x,
                    y: state.hoverConnectionPoint.point.y,
                    componentId: state.hoverConnectionPoint.componentId,
                    side: state.hoverConnectionPoint.side,
                    offset: state.hoverConnectionPoint.offset
                };
                if (mode.end === 'source') {
                    mode.connection.sourcePoint = newPoint;
                } else {
                    mode.connection.targetPoint = newPoint;
                }
                changed = true;
            }
            state.mode = IDLE;
            state.hoverConnectionPoint = null;
            state.canvas.style.cursor = 'default';
            callbacks.render();
            break;

        case 'connecting':
            changed = completeConnection(state, mode.source, mode.dragStartPos, callbacks) || changed;
            break;

        case 'resizing':
            state.mode = IDLE;
            state.canvas.style.cursor = 'default';
            callbacks.render();
            changed = true;
            break;

        case 'dragging': {
            const dragged = getDraggedComponents(state, mode.component);
            for (const comp of dragged) {
                if (comp instanceof Port) snapPortToBorder(comp, state.elements);
            }

            handleDragEnd(state, mode.component);
            state.potentialDropTarget = null;
            state.mode = IDLE;
            state.canvas.style.cursor = state.hoveredElement ? 'grab' : 'default';
            changed = true;
            break;
        }
    }

    if (changed) {
        callbacks.saveToStorage();
    }
}

function completeBoxSelection(state: EditorState, start: Point, current: Point): void {
    const boxLeft = Math.min(start.x, current.x);
    const boxTop = Math.min(start.y, current.y);
    const boxRight = Math.max(start.x, current.x);
    const boxBottom = Math.max(start.y, current.y);

    for (const component of state.elements) {
        const fitsInside =
            component.x >= boxLeft &&
            component.y >= boxTop &&
            component.x + component.width <= boxRight &&
            component.y + component.height <= boxBottom;

        if (fitsInside && !state.selectedElements.includes(component)) {
            component.selected = true;
            state.selectedElements.push(component);
        }
    }

    state.canvas.style.cursor = 'default';
}

function completeConnection(
    state: EditorState,
    source: ConnectionPoint,
    dragStartPos: Point | null,
    callbacks: MouseUpCallbacks
): boolean {
    const minDragDist = 10;
    const rect = state.canvas.getBoundingClientRect();
    const mouseWorldPos = screenToWorld(state, state.lastScreenMousePos.x - rect.left, state.lastScreenMousePos.y - rect.top);
    const dragDx = dragStartPos ? mouseWorldPos.x - dragStartPos.x : 0;
    const dragDy = dragStartPos ? mouseWorldPos.y - dragStartPos.y : 0;
    const dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy);

    let changed = false;
    if (state.hoverConnectionPoint && dragDist >= minDragDist) {
        callbacks.saveState();
        const sourceEl = state.elements.find(el => el.id === source.componentId);
        const targetEl = state.elements.find(el => el.id === state.hoverConnectionPoint!.componentId);
        const involvesNote = sourceEl instanceof Note || targetEl instanceof Note;
        const connection = new Connection({
            sourcePoint: source,
            targetPoint: {
                x: state.hoverConnectionPoint.point.x,
                y: state.hoverConnectionPoint.point.y,
                componentId: state.hoverConnectionPoint.componentId,
                side: state.hoverConnectionPoint.side,
                offset: state.hoverConnectionPoint.offset
            },
            ...(involvesNote && { lineStyle: 'dotted', arrowType: 'none' })
        });
        state.connections.push(connection);
        changed = true;
    } else if (dragDist < minDragDist) {
        const sourceElement = state.elements.find(el => el.id === source.componentId);
        if (sourceElement) selectElement(state, sourceElement);
    }

    state.mode = IDLE;
    state.hoverConnectionPoint = null;
    state.canvas.style.cursor = 'default';
    callbacks.render();
    return changed;
}

function canDropInto(comp: DiagramElement, target: Module | Domain | System): boolean {
    if (comp === target) return false;
    if (comp instanceof System) return false;        // System is always top-level
    if (comp instanceof Boundary) return false;
    if (comp instanceof Note) return false;
    if (comp instanceof NumberedDot) return false;
    if (comp instanceof Label) return false;
    if (comp instanceof Tag) return false;
    if (target instanceof System && !(comp instanceof Domain)) return false;  // Only Domains go into System
    if (target instanceof Module && comp instanceof Module) return false;     // No nested Modules
    if (target instanceof Module && comp instanceof Domain) return false;     // No Domain inside Module
    return true;
}

function getDraggedComponents(state: EditorState, draggedComponent: DiagramElement): DiagramElement[] {
    return state.selectedElements.length > 1 && state.selectedElements.includes(draggedComponent)
        ? state.selectedElements
        : [draggedComponent];
}

function handleDragEnd(state: EditorState, draggedComponent: DiagramElement): void {
    if (state.potentialDropTarget && canDropInto(draggedComponent, state.potentialDropTarget)) {
        const targetContainer = state.potentialDropTarget;
        const componentsToAdd: DiagramElement[] = [];

        if (state.selectedElements.length > 1 && state.selectedElements.includes(draggedComponent)) {
            const selectedIds = new Set(state.selectedElements.map(e => e.id));
            for (const comp of state.selectedElements) {
                if (canDropInto(comp, targetContainer)) {
                    // Skip elements whose parent is also being moved — they'll follow their parent
                    if (comp.parentId && selectedIds.has(comp.parentId)) continue;
                    componentsToAdd.push(comp);
                }
            }
        } else {
            componentsToAdd.push(draggedComponent);
        }

        // Remove from old parents first
        for (const comp of componentsToAdd) {
            if (comp.parentId && comp.parentId !== targetContainer.id) {
                const currentParent = state.elements.find(c => c.id === comp.parentId) as Module | Domain | System | undefined;
                if (currentParent) currentParent.removeChild(comp);
            }
        }

        // Add all new children in one batch so recalculateBounds sees the full set
        const newToContainer = componentsToAdd.filter(c => c.parentId !== targetContainer.id);
        targetContainer.addChildren(newToContainer);

        // Resolve overlaps after bounds are stable
        for (const comp of componentsToAdd) {
            resolveOverlapInContainer(comp, targetContainer);
        }

        targetContainer.recalculateBounds();
    } else if (!state.potentialDropTarget) {
        const componentsToCheck = getDraggedComponents(state, draggedComponent);

        for (const comp of componentsToCheck) {
            if (comp.parentId) {
                const parent = state.elements.find(c => c.id === comp.parentId) as Module | Domain | System | undefined;
                if (parent) {
                    const centerX = comp.x + comp.width / 2;
                    const centerY = comp.y + comp.height / 2;
                    if (!parent.containsPoint(centerX, centerY)) {
                        parent.removeChild(comp);
                    }
                }
            }
            resolveOverlapAtLevel(comp, state.elements);
        }

        // Recalculate bounds for any containers whose children moved
        for (const el of state.elements) {
            if ((el instanceof Module || el instanceof Domain || el instanceof System) && el.children.length > 0) {
                el.recalculateBounds();
            }
        }
    }
}
