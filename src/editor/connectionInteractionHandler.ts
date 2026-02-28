/**
 * Connection Interaction Handler
 * Manages connection curve editing: control points, anchors, slides
 */

import { Connection, getControlPoint, controlDistance, type Point } from '../canvas/index';
import type { EditorState } from './editorState';
import { selectConnection } from './selectionHandler';

export function resetConnectionCurve(
    state: EditorState,
    connection: Connection,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    saveState();
    connection.customControlPoint1 = null;
    connection.customControlPoint2 = null;
    connection.intermediateAnchors = [];
    render();
    saveToStorage();
}

export function addIntermediateAnchor(
    state: EditorState,
    connection: Connection,
    clickPos: Point,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    saveState();
    connection.addIntermediateAnchor(clickPos, state.elements);
    selectConnection(state, connection);
    render();
    saveToStorage();
}

export function removeIntermediateAnchor(
    state: EditorState,
    connection: Connection,
    anchorIndex: number,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    saveState();
    connection.intermediateAnchors.splice(anchorIndex, 1);
    selectConnection(state, connection);
    render();
    saveToStorage();
}

export function customizeConnectionCurve(
    state: EditorState,
    connection: Connection,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    if (!connection.customControlPoint1 || !connection.customControlPoint2) {
        saveState();

        const sourceComponent = state.elements.find(c => c.id === connection.sourcePoint.componentId);
        const targetComponent = state.elements.find(c => c.id === connection.targetPoint.componentId);
        if (!sourceComponent || !targetComponent) return;

        const sourcePos = sourceComponent.getPointOnBorder(connection.sourcePoint.side, connection.sourcePoint.offset);
        const targetPos = targetComponent.getPointOnBorder(connection.targetPoint.side, connection.targetPoint.offset);

        const ctrlDist = controlDistance(sourcePos, targetPos);
        connection.customControlPoint1 = getControlPoint(sourcePos, connection.sourcePoint.side, ctrlDist);
        connection.customControlPoint2 = getControlPoint(targetPos, connection.targetPoint.side, ctrlDist);

        saveToStorage();
    }

    selectConnection(state, connection);
    render();
}

export function removeConnection(
    state: EditorState,
    connection: Connection,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    const index = state.connections.indexOf(connection);
    if (index > -1) {
        saveState();
        state.connections.splice(index, 1);
        if (state.selectedConnection === connection) {
            state.selectedConnection = null;
        }
        render();
        saveToStorage();
    }
}
