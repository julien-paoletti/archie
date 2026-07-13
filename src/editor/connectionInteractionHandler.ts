/**
 * Connection Interaction Handler
 * Manages connection curve editing: control points, anchors, slides
 */

import { Connection, getControlPoint, controlDistance, type Point } from '../canvas/index';
import type { EditorContext, EditorState } from './editorState';
import { selectConnection } from './selectionHandler';

export function resetConnectionCurve(
    state: EditorState,
    connection: Connection,
    ctx: EditorContext
): void {
    ctx.saveState();
    connection.customControlPoint1 = null;
    connection.customControlPoint2 = null;
    connection.intermediateAnchors = [];
    ctx.render();
    ctx.saveToStorage();
}

export function addIntermediateAnchor(
    state: EditorState,
    connection: Connection,
    clickPos: Point,
    ctx: EditorContext
): void {
    ctx.saveState();
    connection.addIntermediateAnchor(clickPos, state.elements);
    selectConnection(state, connection);
    ctx.render();
    ctx.saveToStorage();
}

export function removeIntermediateAnchor(
    state: EditorState,
    connection: Connection,
    anchorIndex: number,
    ctx: EditorContext
): void {
    ctx.saveState();
    connection.intermediateAnchors.splice(anchorIndex, 1);
    selectConnection(state, connection);
    ctx.render();
    ctx.saveToStorage();
}

export function customizeConnectionCurve(
    state: EditorState,
    connection: Connection,
    ctx: EditorContext
): void {
    if (!connection.customControlPoint1 || !connection.customControlPoint2) {
        ctx.saveState();

        const sourceComponent = state.elements.find(c => c.id === connection.sourcePoint.componentId);
        const targetComponent = state.elements.find(c => c.id === connection.targetPoint.componentId);
        if (!sourceComponent || !targetComponent) return;

        const sourcePos = sourceComponent.getPointOnBorder(connection.sourcePoint.side, connection.sourcePoint.offset);
        const targetPos = targetComponent.getPointOnBorder(connection.targetPoint.side, connection.targetPoint.offset);

        const ctrlDist = controlDistance(sourcePos, targetPos);
        connection.customControlPoint1 = getControlPoint(sourcePos, connection.sourcePoint.side, ctrlDist);
        connection.customControlPoint2 = getControlPoint(targetPos, connection.targetPoint.side, ctrlDist);

        ctx.saveToStorage();
    }

    selectConnection(state, connection);
    ctx.render();
}

export function removeConnection(
    state: EditorState,
    connection: Connection,
    ctx: EditorContext
): void {
    const index = state.connections.indexOf(connection);
    if (index > -1) {
        ctx.saveState();
        state.connections.splice(index, 1);
        if (state.selectedConnection === connection) {
            state.selectedConnection = null;
        }
        ctx.render();
        ctx.saveToStorage();
    }
}
