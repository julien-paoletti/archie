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

    // Handle box selection
    if (state.isBoxSelecting && state.boxSelectStart) {
        state.boxSelectCurrent = { x: pos.x, y: pos.y };
        state.canvas.style.cursor = 'crosshair';
        render();
        return;
    }

    // Handle connection slide dragging
    if (state.isDraggingConnectionSlide && state.slideConnection && state.slideSourceStart && state.slideTargetStart) {
        const deltaY = pos.y - state.slideStartY;

        const sourceComp = state.elements.find(c => c.id === state.slideSourceStart!.componentId);
        const targetComp = state.elements.find(c => c.id === state.slideTargetStart!.componentId);
        if (sourceComp && targetComp) {
            const sourceOrig = sourceComp.getPointOnBorder(state.slideSourceStart.side, state.slideSourceStart.offset);
            const targetOrig = targetComp.getPointOnBorder(state.slideTargetStart.side, state.slideTargetStart.offset);

            const newSourceBorder = projectPointOnBorder(sourceComp, sourceOrig.x, sourceOrig.y + deltaY);
            const newTargetBorder = projectPointOnBorder(targetComp, targetOrig.x, targetOrig.y + deltaY);

            if (newSourceBorder) {
                state.slideConnection.sourcePoint = {
                    ...state.slideConnection.sourcePoint,
                    side: newSourceBorder.side,
                    offset: newSourceBorder.offset
                };
            }
            if (newTargetBorder) {
                state.slideConnection.targetPoint = {
                    ...state.slideConnection.targetPoint,
                    side: newTargetBorder.side,
                    offset: newTargetBorder.offset
                };
            }
        }
        state.canvas.style.cursor = 'ns-resize';
        render();
        return;
    }

    // Handle dragging control point
    if (state.isDraggingControlPoint && state.draggedControlConnection && state.draggedControlPointType) {
        if (state.draggedControlPointType === 'source') {
            state.draggedControlConnection.customControlPoint1 = { x: pos.x, y: pos.y };
        } else {
            state.draggedControlConnection.customControlPoint2 = { x: pos.x, y: pos.y };
        }
        state.canvas.style.cursor = 'move';
        render();
        return;
    }

    // Handle dragging intermediate anchor
    if (state.isDraggingIntermediateAnchor && state.draggedAnchorConnection && state.draggedAnchorIndex !== null) {
        const anchor = state.draggedAnchorConnection.intermediateAnchors[state.draggedAnchorIndex];
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

    // Handle dragging intermediate anchor handle
    if (state.isDraggingIntermediateHandle && state.draggedAnchorConnection && state.draggedAnchorIndex !== null && state.draggedHandleType) {
        const anchor = state.draggedAnchorConnection.intermediateAnchors[state.draggedAnchorIndex];
        if (anchor) {
            if (state.draggedHandleType === 'in') {
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

    // Handle dragging existing connection point
    if (state.isDraggingConnectionPoint && state.draggedConnection && state.draggedConnectionEnd) {
        state.hoverConnectionPoint = null;
        for (const component of state.elements) {
            const borderPoint = component.getNearestBorderPoint(pos.x, pos.y);
            if (borderPoint) {
                state.hoverConnectionPoint = {
                    ...borderPoint,
                    componentId: component.id
                };
                break;
            }
        }

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
        }

        state.canvas.style.cursor = 'crosshair';
        render();
        return;
    }

    // Handle connection dragging
    if (state.isConnecting && state.sourceConnectionPoint) {
        state.hoverConnectionPoint = null;
        for (const component of state.elements) {
            const borderPoint = component.getNearestBorderPoint(pos.x, pos.y);
            if (borderPoint) {
                state.hoverConnectionPoint = {
                    ...borderPoint,
                    componentId: component.id
                };
                break;
            }
        }
        state.canvas.style.cursor = 'crosshair';
        render();
        return;
    }

    // Handle resizing
    if (state.isResizing && state.selectedElements.length === 1 && state.resizeHandle) {
        const selectedComponent = state.selectedElements[0]!;
        let dx = pos.x - state.resizeStartPos.x;
        let dy = pos.y - state.resizeStartPos.y;

        if (state.snapToGrid) {
            dx = Math.round(dx / state.gridSize) * state.gridSize;
            if (!(selectedComponent instanceof Note)) {
                dy = Math.round(dy / state.gridSize) * state.gridSize;
            }
        }

        selectedComponent.x = state.resizeStartBounds.x;
        selectedComponent.y = state.resizeStartBounds.y;
        selectedComponent.width = state.resizeStartBounds.width;
        selectedComponent.height = state.resizeStartBounds.height;

        selectedComponent.resize(state.resizeHandle, dx, dy);

        const rightEdge = selectedComponent.x + selectedComponent.width;
        const bottomEdge = selectedComponent.y + selectedComponent.height;
        checkAndExtendWorld(state, rightEdge, bottomEdge);

        render();
        return;
    }

    // Handle dragging
    if (state.isDragging && state.draggedComponent) {
        let newX = pos.x - state.dragOffset.x;
        let newY = pos.y - state.dragOffset.y;

        if (state.snapToGrid && !(state.draggedComponent instanceof NumberedDot) && !(state.draggedComponent instanceof Tag) && !(state.draggedComponent instanceof Port)) {
            newX = Math.round(newX / state.gridSize) * state.gridSize;
            newY = Math.round(newY / state.gridSize) * state.gridSize;
        }

        // Shift key constrains movement to a single axis (horizontal or vertical)
        if (e.shiftKey && state.dragStartPos) {
            const absDx = Math.abs(newX - state.dragStartPos.x);
            const absDy = Math.abs(newY - state.dragStartPos.y);
            if (absDx >= absDy) {
                newY = state.dragStartPos.y;
            } else {
                newX = state.dragStartPos.x;
            }
        }

        const dx = newX - state.draggedComponent.x;
        const dy = newY - state.draggedComponent.y;

        state.draggedComponent.moveTo(newX, newY);

        for (const comp of state.selectedElements) {
            if (comp !== state.draggedComponent) {
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

        const rightEdge = state.draggedComponent.x + state.draggedComponent.width;
        const bottomEdge = state.draggedComponent.y + state.draggedComponent.height;
        checkAndExtendWorld(state, rightEdge, bottomEdge);

        // Check for potential container drop target
        const centerX = state.draggedComponent.x + state.draggedComponent.width / 2;
        const centerY = state.draggedComponent.y + state.draggedComponent.height / 2;

        if (state.draggedComponent instanceof System) {
            state.potentialDropTarget = null;
        } else if (state.draggedComponent instanceof Boundary || state.draggedComponent instanceof Note || state.draggedComponent instanceof NumberedDot || state.draggedComponent instanceof Label || state.draggedComponent instanceof Tag) {
            state.potentialDropTarget = null;
        } else if (state.draggedComponent instanceof Domain) {
            state.potentialDropTarget = findSystemAtPoint(state, centerX, centerY, state.draggedComponent);
        } else if (state.draggedComponent instanceof Module) {
            state.potentialDropTarget = findDomainAtPoint(state, centerX, centerY, state.draggedComponent);
        } else {
            state.potentialDropTarget = findContainerAtPoint(state, centerX, centerY, state.draggedComponent);
        }

        render();
        return;
    }

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
                // For Port: only show connection point when a connection is already being drawn
                if (component instanceof Port && !state.isConnecting) break;
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
