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
    System,
    Tag,
    type ConnectionPoint,
    type DiagramElement
} from '../canvas/index';
import type { EditorState } from './editorState';
import { screenToWorld, stopAutoScroll } from './viewportHandler';
import { selectElement } from './selectionHandler';
import { resolveOverlapInContainer, resolveOverlapAtLevel } from './dragDropHandler';

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

    if (state.isBoxSelecting && state.boxSelectStart && state.boxSelectCurrent) {
        completeBoxSelection(state);
        callbacks.render();
    }

    if (state.isDraggingConnectionSlide) {
        state.isDraggingConnectionSlide = false;
        state.slideConnection = null;
        state.slideSourceStart = null;
        state.slideTargetStart = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
        changed = true;
    }

    if (state.isDraggingControlPoint) {
        state.isDraggingControlPoint = false;
        state.draggedControlConnection = null;
        state.draggedControlPointType = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
        changed = true;
    }

    if (state.isDraggingIntermediateAnchor) {
        state.isDraggingIntermediateAnchor = false;
        state.draggedAnchorConnection = null;
        state.draggedAnchorIndex = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
        changed = true;
    }

    if (state.isDraggingIntermediateHandle) {
        state.isDraggingIntermediateHandle = false;
        state.draggedAnchorConnection = null;
        state.draggedAnchorIndex = null;
        state.draggedHandleType = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
        changed = true;
    }

    if (state.isDraggingConnectionPoint && state.draggedConnection && state.draggedConnectionEnd) {
        if (state.hoverConnectionPoint) {
            const newPoint: ConnectionPoint = {
                x: state.hoverConnectionPoint.point.x,
                y: state.hoverConnectionPoint.point.y,
                componentId: state.hoverConnectionPoint.componentId,
                side: state.hoverConnectionPoint.side,
                offset: state.hoverConnectionPoint.offset
            };
            if (state.draggedConnectionEnd === 'source') {
                state.draggedConnection.sourcePoint = newPoint;
            } else {
                state.draggedConnection.targetPoint = newPoint;
            }
            changed = true;
        }
        state.isDraggingConnectionPoint = false;
        state.draggedConnection = null;
        state.draggedConnectionEnd = null;
        state.hoverConnectionPoint = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
    }

    if (state.isConnecting && state.sourceConnectionPoint) {
        changed = completeConnection(state, callbacks) || changed;
    }

    if (state.isResizing) {
        state.isResizing = false;
        state.resizeHandle = null;
        state.canvas.style.cursor = 'default';
        callbacks.render();
        changed = true;
    }

    if (state.isDragging) {
        handleDragEnd(state);
        state.potentialDropTarget = null;
        state.isDragging = false;
        state.draggedComponent = null;
        state.dragStartPos = null;
        state.isCloneDrag = false;
        state.canvas.style.cursor = state.hoveredElement ? 'grab' : 'default';
        changed = true;
    }

    if (changed) {
        callbacks.saveToStorage();
    }
}

function completeBoxSelection(state: EditorState): void {
    const boxLeft = Math.min(state.boxSelectStart!.x, state.boxSelectCurrent!.x);
    const boxTop = Math.min(state.boxSelectStart!.y, state.boxSelectCurrent!.y);
    const boxRight = Math.max(state.boxSelectStart!.x, state.boxSelectCurrent!.x);
    const boxBottom = Math.max(state.boxSelectStart!.y, state.boxSelectCurrent!.y);

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

    state.isBoxSelecting = false;
    state.boxSelectStart = null;
    state.boxSelectCurrent = null;
    state.canvas.style.cursor = 'default';
}

function completeConnection(state: EditorState, callbacks: MouseUpCallbacks): boolean {
    const minDragDist = 10;
    const rect = state.canvas.getBoundingClientRect();
    const mouseWorldPos = screenToWorld(state, state.lastScreenMousePos.x - rect.left, state.lastScreenMousePos.y - rect.top);
    const dragDx = state.connectionDragStartPos ? mouseWorldPos.x - state.connectionDragStartPos.x : 0;
    const dragDy = state.connectionDragStartPos ? mouseWorldPos.y - state.connectionDragStartPos.y : 0;
    const dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy);

    let changed = false;
    if (state.hoverConnectionPoint && dragDist >= minDragDist) {
        callbacks.saveState();
        const connection = new Connection({
            sourcePoint: state.sourceConnectionPoint!,
            targetPoint: {
                x: state.hoverConnectionPoint.point.x,
                y: state.hoverConnectionPoint.point.y,
                componentId: state.hoverConnectionPoint.componentId,
                side: state.hoverConnectionPoint.side,
                offset: state.hoverConnectionPoint.offset
            }
        });
        state.connections.push(connection);
        changed = true;
    } else if (dragDist < minDragDist) {
        const sourceElement = state.elements.find(el => el.id === state.sourceConnectionPoint!.componentId);
        if (sourceElement) selectElement(state, sourceElement);
    }

    state.isConnecting = false;
    state.sourceConnectionPoint = null;
    state.connectionDragStartPos = null;
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

function handleDragEnd(state: EditorState): void {
    if (state.potentialDropTarget && state.draggedComponent && canDropInto(state.draggedComponent, state.potentialDropTarget)) {
        const targetContainer = state.potentialDropTarget;
        const componentsToAdd: DiagramElement[] = [];

        if (state.selectedElements.length > 1 && state.selectedElements.includes(state.draggedComponent)) {
            for (const comp of state.selectedElements) {
                if (canDropInto(comp, targetContainer)) {
                    componentsToAdd.push(comp);
                }
            }
        } else {
            componentsToAdd.push(state.draggedComponent);
        }

        for (const comp of componentsToAdd) {
            const isNewToContainer = comp.parentId !== targetContainer.id;
            if (comp.parentId && comp.parentId !== targetContainer.id) {
                const currentParent = state.elements.find(c => c.id === comp.parentId) as Module | Domain | System | undefined;
                if (currentParent) currentParent.removeChild(comp);
            }
            if (isNewToContainer) targetContainer.addChild(comp);
            resolveOverlapInContainer(comp, targetContainer);
        }

        targetContainer.recalculateBounds();
    } else if (!state.potentialDropTarget) {
        const componentsToCheck = state.selectedElements.length > 1 && state.draggedComponent && state.selectedElements.includes(state.draggedComponent)
            ? state.selectedElements
            : (state.draggedComponent ? [state.draggedComponent] : []);

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
