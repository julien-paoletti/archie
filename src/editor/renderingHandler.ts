/**
 * Rendering Handler
 * Manages canvas rendering, drawing methods for UI overlays
 */

import {
    CONNECTION_POINT_RADIUS,
    Domain,
    Module,
    getControlPoint,
    controlDistance,
    type ConnectionPoint,
    type DiagramElement,
    type Point
} from '../canvas/index';
import type { EditorState } from './editorState';
import { worldToScreen } from './viewportHandler';
import { getSortedComponentsForRendering } from './selectionHandler';

export function render(state: EditorState): void {
    state.renderer.clear();

    state.ctx.save();
    state.ctx.translate(state.panOffset.x, state.panOffset.y);
    state.ctx.scale(state.scale, state.scale);

    const sortedComponents = getSortedComponentsForRendering(state);
    sortedComponents.forEach(component => {
        component.draw(state.ctx);
    });

    if (state.potentialDropTarget) {
        drawDropTargetHighlight(state, state.potentialDropTarget);
    }

    state.connections.forEach(connection => {
        connection.draw(state.ctx, state.elements);
    });

    if (state.hoverConnectionPoint && !state.isConnecting && !state.isDraggingConnectionPoint) {
        drawConnectionPoint(state.ctx, state.hoverConnectionPoint.point);
    }

    if (state.isConnecting && state.sourceConnectionPoint && state.mousePos) {
        drawConnectionInProgress(state);
    }

    if (state.isDraggingConnectionPoint && state.hoverConnectionPoint) {
        drawConnectionPoint(state.ctx, state.hoverConnectionPoint.point);
    }

    if (state.isBoxSelecting && state.boxSelectStart && state.boxSelectCurrent) {
        drawBoxSelection(state);
    }

    state.ctx.restore();

    drawCrosshair(state);
    drawZoomIndicator(state);
}

function drawZoomIndicator(state: EditorState): void {
    const ctx = state.ctx;
    const zoomPercent = Math.round(state.scale * 100);
    const text = `${zoomPercent}%`;

    ctx.save();
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const padding = 10;
    const containerRect = state.container.getBoundingClientRect();
    ctx.fillText(text, containerRect.width - padding, containerRect.height - padding);
    ctx.restore();
}

function drawBoxSelection(state: EditorState): void {
    if (!state.boxSelectStart || !state.boxSelectCurrent) return;

    const ctx = state.ctx;
    const x = Math.min(state.boxSelectStart.x, state.boxSelectCurrent.x);
    const y = Math.min(state.boxSelectStart.y, state.boxSelectCurrent.y);
    const width = Math.abs(state.boxSelectCurrent.x - state.boxSelectStart.x);
    const height = Math.abs(state.boxSelectCurrent.y - state.boxSelectStart.y);

    ctx.save();
    ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
}

function drawDropTargetHighlight(state: EditorState, container: Module | Domain): void {
    const ctx = state.ctx;
    ctx.save();

    ctx.strokeStyle = container instanceof Domain
        ? 'rgba(59, 130, 246, 0.8)'
        : 'rgba(20, 184, 166, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(container.x, container.y, container.width, container.height);

    ctx.restore();
}

function drawCrosshair(state: EditorState): void {
    if (!state.showCrosshair || !state.mousePos) return;

    const ctx = state.ctx;
    const rect = state.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const screenPos = worldToScreen(state, state.mousePos.x, state.mousePos.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(screenPos.x, 0);
    ctx.lineTo(screenPos.x, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, screenPos.y);
    ctx.lineTo(width, screenPos.y);
    ctx.stroke();

    ctx.restore();
}

export function drawConnectionPoint(ctx: CanvasRenderingContext2D, pos: Point): void {
    ctx.save();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, CONNECTION_POINT_RADIUS + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, CONNECTION_POINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function drawConnectionInProgress(state: EditorState): void {
    if (!state.sourceConnectionPoint || !state.mousePos) return;

    const ctx = state.ctx;
    const sourceComponent = state.elements.find(c => c.id === state.sourceConnectionPoint!.componentId);
    if (!sourceComponent) return;

    const sourcePos = sourceComponent.getPointOnBorder(
        state.sourceConnectionPoint.side,
        state.sourceConnectionPoint.offset
    );

    ctx.save();

    drawConnectionPoint(ctx, sourcePos);

    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineCap = 'round';

    const targetPos = state.hoverConnectionPoint
        ? state.hoverConnectionPoint.point
        : state.mousePos;

    const ctrlDist = controlDistance(sourcePos, targetPos);
    const sourceControl = getControlPoint(sourcePos, state.sourceConnectionPoint.side, ctrlDist);

    let targetControl: Point;
    if (state.hoverConnectionPoint) {
        targetControl = getControlPoint(targetPos, state.hoverConnectionPoint.side, ctrlDist);
    } else {
        targetControl = {
            x: targetPos.x + (sourcePos.x - targetPos.x) * 0.3,
            y: targetPos.y + (sourcePos.y - targetPos.y) * 0.3
        };
    }

    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.bezierCurveTo(
        sourceControl.x, sourceControl.y,
        targetControl.x, targetControl.y,
        targetPos.x, targetPos.y
    );
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.hoverConnectionPoint) {
        drawConnectionPoint(ctx, state.hoverConnectionPoint.point);
    }

    ctx.restore();
}
