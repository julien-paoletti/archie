/**
 * Mouse Handler
 * Handles mouseDown, mouseLeave, and document-level mouse events
 */

import {
    Connection,
    ContainerElement,
    Domain,
    Module,
    System,
    type DiagramElement
} from '../canvas/index';
import { isDragOperation, type EditorState } from './editorState';
import { getResizeCursor } from './cursorUtils';
import { getMousePosition, screenToWorld } from './viewportHandler';
import {
    clearSelection,
    findComponentAtPoint,
    findConnectionAtPoint,
    findConnectionPointAtPosition,
    selectConnection,
    selectElement
} from './selectionHandler';
import { handleMouseUp, type MouseUpCallbacks } from './mouseUpHandler';

export type MouseHandlerCallbacks = MouseUpCallbacks;
export { handleMouseUp } from './mouseUpHandler';

/** Recursively clone an element and all its descendants, pushing every clone into state.elements. */
function cloneDeep(element: DiagramElement, elements: DiagramElement[]): DiagramElement {
    const clone = element.clone();
    clone.moveTo(element.x, element.y);
    elements.push(clone);

    if (element instanceof ContainerElement) {
        for (const child of element.children) {
            const childClone = cloneDeep(child, elements);
            (clone as ContainerElement).addChild(childClone);
        }
    }

    return clone;
}

export function handleMouseDown(state: EditorState, e: MouseEvent, callbacks: MouseHandlerCallbacks): void {
    const rect = state.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Handle panning with middle mouse button or space+left click
    if (e.button === 1 || (e.button === 0 && state.isSpacePressed)) {
        e.preventDefault();
        state.isPanning = true;
        state.panStart = { x: screenX - state.panOffset.x, y: screenY - state.panOffset.y };
        state.canvas.style.cursor = 'grabbing';
        return;
    }

    const pos = getMousePosition(state, e);

    // Check if clicking on a control point handle (to drag it)
    if (state.selectedConnection) {
        const controlPoint = state.selectedConnection.getControlPointAtPosition(pos.x, pos.y, state.elements);
        if (controlPoint) {
            callbacks.saveState();
            state.isDraggingControlPoint = true;
            state.draggedControlConnection = state.selectedConnection;
            state.draggedControlPointType = controlPoint;
            state.canvas.style.cursor = 'move';
            callbacks.render();
            return;
        }

        const anchorHandle = state.selectedConnection.getIntermediateAnchorHandleAtPosition(pos.x, pos.y);
        if (anchorHandle) {
            callbacks.saveState();
            state.isDraggingIntermediateHandle = true;
            state.draggedAnchorConnection = state.selectedConnection;
            state.draggedAnchorIndex = anchorHandle.anchorIndex;
            state.draggedHandleType = anchorHandle.handleType;
            state.canvas.style.cursor = 'move';
            callbacks.render();
            return;
        }

        const anchorIndex = state.selectedConnection.getIntermediateAnchorAtPosition(pos.x, pos.y);
        if (anchorIndex !== null) {
            callbacks.saveState();
            state.isDraggingIntermediateAnchor = true;
            state.draggedAnchorConnection = state.selectedConnection;
            state.draggedAnchorIndex = anchorIndex;
            state.canvas.style.cursor = 'move';
            callbacks.render();
            return;
        }
    }

    // Check if clicking on a resize handle of selected component
    if (state.selectedElements.length === 1) {
        const selectedComponent = state.selectedElements[0]!;
        const handle = selectedComponent.getResizeHandleAtPoint(pos.x, pos.y);
        if (handle) {
            callbacks.saveState();
            state.isResizing = true;
            state.resizeHandle = handle;
            state.resizeStartPos = { x: pos.x, y: pos.y };
            state.resizeStartBounds = {
                x: selectedComponent.x, y: selectedComponent.y,
                width: selectedComponent.width, height: selectedComponent.height
            };
            state.canvas.style.cursor = getResizeCursor(handle);
            return;
        }
    }

    // Check if clicking on an existing connection point (to drag it)
    const existingPoint = findConnectionPointAtPosition(state, pos.x, pos.y);
    if (existingPoint) {
        callbacks.saveState();
        state.isDraggingConnectionPoint = true;
        state.draggedConnection = existingPoint.connection;
        state.draggedConnectionEnd = existingPoint.end;
        selectConnection(state, existingPoint.connection);
        selectElement(state, null);
        state.canvas.style.cursor = 'crosshair';
        callbacks.render();
        return;
    }

    // Check if clicking on a connection
    const connection = findConnectionAtPoint(state, pos.x, pos.y);
    if (connection) {
        callbacks.saveState();
        selectConnection(state, connection);
        clearSelection(state);
        state.isDraggingConnectionSlide = true;
        state.slideConnection = connection;
        state.slideStartY = pos.y;
        state.slideSourceStart = { ...connection.sourcePoint };
        state.slideTargetStart = { ...connection.targetPoint };
        state.canvas.style.cursor = 'ns-resize';
        callbacks.render();
        return;
    }

    // Check if clicking on a connection point (starting a connection)
    if (state.hoverConnectionPoint && !e.ctrlKey) {
        state.isConnecting = true;
        state.sourceConnectionPoint = {
            x: state.hoverConnectionPoint.point.x,
            y: state.hoverConnectionPoint.point.y,
            componentId: state.hoverConnectionPoint.componentId,
            side: state.hoverConnectionPoint.side,
            offset: state.hoverConnectionPoint.offset
        };
        state.connectionDragStartPos = { x: pos.x, y: pos.y };
        state.canvas.style.cursor = 'crosshair';
        callbacks.render();
        return;
    }

    const element = findComponentAtPoint(state, pos.x, pos.y);

    if (element) {
        selectConnection(state, null);

        // Shift+click for multi-selection
        if (e.shiftKey) {
            const index = state.selectedElements.indexOf(element);
            if (index > -1) {
                state.selectedElements.splice(index, 1);
                element.selected = false;
            } else {
                state.selectedElements.push(element);
                element.selected = true;
            }
            callbacks.render();
            return;
        }

        callbacks.saveState();
        state.isDragging = true;
        state.dragOffset = { x: pos.x - element.x, y: pos.y - element.y };
        state.dragStartPos = { x: element.x, y: element.y };

        // Ctrl+drag to clone
        if (e.ctrlKey) {
            const isMultiSelect = state.selectedElements.length > 1 && state.selectedElements.includes(element);
            if (isMultiSelect) {
                const idMap = new Map<string, string>();
                const clones: DiagramElement[] = [];

                const selectedIds = new Set(state.selectedElements.map(e => e.id));
                const topLevel = state.selectedElements.filter(e => !e.parentId || !selectedIds.has(e.parentId));

                for (const el of topLevel) {
                    const c = cloneDeep(el, state.elements);
                    idMap.set(el.id, c.id);
                    clones.push(c);
                }

                const connClones: Connection[] = [];
                for (const conn of state.connections) {
                    const newSrcId = idMap.get(conn.sourcePoint.componentId);
                    const newTgtId = idMap.get(conn.targetPoint.componentId);
                    if (newSrcId && newTgtId) {
                        connClones.push(new Connection({
                            ...conn,
                            id: undefined as any,
                            sourcePoint: { ...conn.sourcePoint, componentId: newSrcId },
                            targetPoint: { ...conn.targetPoint, componentId: newTgtId },
                            customControlPoint1: conn.customControlPoint1 ?? undefined,
                            customControlPoint2: conn.customControlPoint2 ?? undefined,
                        }));
                    }
                }
                state.connections.push(...connClones);

                state.selectedElements.forEach(el => { el.selected = false; });
                state.selectedElements = clones;
                for (const c of clones) c.selected = true;

                const clickedClone = clones[topLevel.indexOf(element)] ?? clones[0]!;
                state.draggedComponent = clickedClone;
                state.dragOffset = { x: pos.x - clickedClone.x, y: pos.y - clickedClone.y };
            } else {
                const clone = cloneDeep(element, state.elements);
                state.draggedComponent = clone;
                selectElement(state, clone);
            }
            state.isCloneDrag = true;
        } else {
            state.draggedComponent = element;
            if (!state.selectedElements.includes(element)) {
                selectElement(state, element);
            }
            state.isCloneDrag = false;
        }

        state.canvas.style.cursor = 'grabbing';
    } else {
        // Start box selection on empty canvas
        if (!e.shiftKey) clearSelection(state);
        selectConnection(state, null);
        state.isBoxSelecting = true;
        state.boxSelectStart = { x: pos.x, y: pos.y };
        state.boxSelectCurrent = { x: pos.x, y: pos.y };
    }

    callbacks.render();
}

export function handleMouseLeave(state: EditorState, render: () => void): void {
    state.mousePos = null;
    state.hoverConnectionPoint = null;
    if (state.hoveredElement) {
        state.hoveredElement.hovered = false;
        state.hoveredElement = null;
    }

    const isDragging = isDragOperation(state);
    if (!isDragging) {
        state.canvas.style.cursor = 'default';
    }

    render();
}

export function handleDocumentMouseMove(state: EditorState, e: MouseEvent, startAutoScrollFn: () => void): void {
    const isDragging = isDragOperation(state);
    if (!isDragging) return;

    const rect = state.canvas.getBoundingClientRect();
    const isOutsideCanvas = e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom;

    if (isOutsideCanvas) {
        state.lastScreenMousePos = { x: e.clientX, y: e.clientY };
        startAutoScrollFn();
    }
}

export function handleDocumentMouseUp(state: EditorState, callbacks: MouseHandlerCallbacks): void {
    const isDragging = isDragOperation(state);
    if (!isDragging) return;

    handleMouseUp(state, callbacks);
}
