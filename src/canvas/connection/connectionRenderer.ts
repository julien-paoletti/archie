/**
 * Connection Renderer
 * Handles all drawing logic for connections
 */

import type { Point, IntermediateAnchor, ArrowType, CurveType } from '../types';
import type { BezierSegment } from './catmullRomMath';
import { getBezierPoint } from './connectionMath';
import {
    SELECTED_COLOR,
    SELECTION_HIGHLIGHT_COLOR,
    HANDLE_LINE_COLOR,
    HANDLE_FILL_COLOR,
    LABEL_BG_COLOR,
    LABEL_TEXT_COLOR,
} from '../constants';

const HANDLE_RADIUS = 6;
const ANCHOR_RADIUS = 8;
const ARROW_LENGTH = 12;
const ARROW_TIP_EXTENSION = 2;
const ARROW_ANGLE = Math.PI / 6;

export interface ConnectionDrawData {
    sourcePos: Point;
    targetPos: Point;
    sourceControl: Point;
    targetControl: Point;
    strokeColor: string;
    strokeWidth: number;
    selected: boolean;
    lineDash: number[];
    arrowType: ArrowType;
    curveType: CurveType;
    label: string;
    hideLabel: boolean;
}

export function drawSingleSegment(ctx: CanvasRenderingContext2D, data: ConnectionDrawData): void {
    const { sourcePos, targetPos, sourceControl, targetControl, selected, strokeColor, strokeWidth, lineDash, arrowType, label, hideLabel } = data;

    if (selected) {
        drawSelectionHighlight(ctx, strokeWidth, () => {
            ctx.moveTo(sourcePos.x, sourcePos.y);
            ctx.bezierCurveTo(sourceControl.x, sourceControl.y, targetControl.x, targetControl.y, targetPos.x, targetPos.y);
        });
    }

    ctx.strokeStyle = selected ? SELECTED_COLOR : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(lineDash);

    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.bezierCurveTo(sourceControl.x, sourceControl.y, targetControl.x, targetControl.y, targetPos.x, targetPos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (arrowType !== 'none') {
        const arrowColor = selected ? SELECTED_COLOR : strokeColor;
        drawArrowHead(ctx, targetPos, targetControl, arrowColor, strokeWidth, arrowType);
    }

    if (selected) {
        drawControlPointHandles(ctx, sourcePos, targetPos, sourceControl, targetControl);
    }

    if (label && !hideLabel) {
        const midPoint = getBezierPoint(0.5, sourcePos, sourceControl, targetControl, targetPos);
        drawLabel(ctx, midPoint, label, selected, strokeColor);
    }
}

export function drawMultiSegment(
    ctx: CanvasRenderingContext2D,
    data: ConnectionDrawData,
    intermediateAnchors: IntermediateAnchor[],
    firstOutHandle: Point,
    lastInHandle: Point
): void {
    const { sourcePos, targetPos, selected, strokeColor, strokeWidth, lineDash, arrowType, label, hideLabel } = data;
    const lastAnchor = intermediateAnchors[intermediateAnchors.length - 1]!;

    const drawPath = () => {
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.bezierCurveTo(firstOutHandle.x, firstOutHandle.y, intermediateAnchors[0]!.handleIn.x, intermediateAnchors[0]!.handleIn.y, intermediateAnchors[0]!.position.x, intermediateAnchors[0]!.position.y);
        for (let i = 0; i < intermediateAnchors.length - 1; i++) {
            ctx.bezierCurveTo(intermediateAnchors[i]!.handleOut.x, intermediateAnchors[i]!.handleOut.y, intermediateAnchors[i + 1]!.handleIn.x, intermediateAnchors[i + 1]!.handleIn.y, intermediateAnchors[i + 1]!.position.x, intermediateAnchors[i + 1]!.position.y);
        }
        ctx.bezierCurveTo(lastAnchor.handleOut.x, lastAnchor.handleOut.y, lastInHandle.x, lastInHandle.y, targetPos.x, targetPos.y);
    };

    if (selected) {
        drawSelectionHighlight(ctx, strokeWidth, drawPath);
    }

    ctx.strokeStyle = selected ? SELECTED_COLOR : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(lineDash);
    ctx.beginPath();
    drawPath();
    ctx.stroke();
    ctx.setLineDash([]);

    if (arrowType !== 'none') {
        const arrowColor = selected ? SELECTED_COLOR : strokeColor;
        drawArrowHead(ctx, targetPos, lastInHandle, arrowColor, strokeWidth, arrowType);
    }

    if (selected) {
        drawIntermediateAnchorHandles(ctx, intermediateAnchors, firstOutHandle, lastInHandle, sourcePos, targetPos);
    }

    if (label && !hideLabel) {
        const totalSegments = intermediateAnchors.length + 1;
        const midSegmentIndex = Math.floor(totalSegments / 2);

        let midPoint: Point;
        if (midSegmentIndex === 0) {
            midPoint = getBezierPoint(0.5, sourcePos, firstOutHandle, intermediateAnchors[0]!.handleIn, intermediateAnchors[0]!.position);
        } else if (midSegmentIndex === intermediateAnchors.length) {
            midPoint = getBezierPoint(0.5, lastAnchor.position, lastAnchor.handleOut, lastInHandle, targetPos);
        } else {
            const anchor1 = intermediateAnchors[midSegmentIndex - 1]!;
            const anchor2 = intermediateAnchors[midSegmentIndex]!;
            midPoint = getBezierPoint(0.5, anchor1.position, anchor1.handleOut, anchor2.handleIn, anchor2.position);
        }

        drawLabel(ctx, midPoint, label, selected, strokeColor);
    }
}

function drawSelectionHighlight(ctx: CanvasRenderingContext2D, strokeWidth: number, drawPath: () => void): void {
    ctx.strokeStyle = SELECTION_HIGHLIGHT_COLOR;
    ctx.lineWidth = strokeWidth + 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    drawPath();
    ctx.stroke();
}

function drawIntermediateAnchorHandles(
    ctx: CanvasRenderingContext2D,
    anchors: IntermediateAnchor[],
    firstOutHandle: Point,
    lastInHandle: Point,
    sourcePos: Point,
    targetPos: Point
): void {
    ctx.strokeStyle = HANDLE_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.lineTo(firstOutHandle.x, firstOutHandle.y);
    ctx.stroke();

    for (const anchor of anchors) {
        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleIn.x, anchor.handleIn.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleOut.x, anchor.handleOut.y);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(targetPos.x, targetPos.y);
    ctx.lineTo(lastInHandle.x, lastInHandle.y);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = SELECTED_COLOR;
    ctx.strokeStyle = HANDLE_FILL_COLOR;
    ctx.lineWidth = 2;

    for (const anchor of anchors) {
        ctx.beginPath();
        ctx.arc(anchor.position.x, anchor.position.y, ANCHOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    const handles = [firstOutHandle, ...anchors.flatMap(a => [a.handleIn, a.handleOut]), lastInHandle];
    for (const handle of handles) {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

function drawControlPointHandles(ctx: CanvasRenderingContext2D, sourcePos: Point, targetPos: Point, sourceControl: Point, targetControl: Point): void {
    ctx.strokeStyle = HANDLE_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.lineTo(sourceControl.x, sourceControl.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(targetPos.x, targetPos.y);
    ctx.lineTo(targetControl.x, targetControl.y);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = SELECTED_COLOR;
    ctx.strokeStyle = HANDLE_FILL_COLOR;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(sourceControl.x, sourceControl.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetControl.x, targetControl.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, pos: Point, label: string, selected: boolean, strokeColor: string): void {
    const padding = 4;
    const borderRadius = 4;
    ctx.font = '12px "Segoe UI", sans-serif';
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;
    const textHeight = 14;

    const x = pos.x - textWidth / 2 - padding;
    const y = pos.y - textHeight / 2 - padding;
    const width = textWidth + padding * 2;
    const height = textHeight + padding * 2;

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.fillStyle = LABEL_BG_COLOR;
    ctx.fill();

    ctx.strokeStyle = selected ? SELECTED_COLOR : strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = LABEL_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pos.x, pos.y);
}

export function drawCatmullRomConnection(
    ctx: CanvasRenderingContext2D,
    data: ConnectionDrawData,
    segments: BezierSegment[],
    anchors: IntermediateAnchor[]
): void {
    if (segments.length === 0) return;
    const { selected, strokeColor, strokeWidth, lineDash, arrowType, label, hideLabel } = data;

    const drawPath = () => {
        ctx.moveTo(segments[0]!.start.x, segments[0]!.start.y);
        for (const seg of segments) {
            ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
        }
    };

    if (selected) {
        drawSelectionHighlight(ctx, strokeWidth, drawPath);
    }

    ctx.strokeStyle = selected ? SELECTED_COLOR : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(lineDash);
    ctx.beginPath();
    drawPath();
    ctx.stroke();
    ctx.setLineDash([]);

    if (arrowType !== 'none') {
        const lastSeg = segments[segments.length - 1]!;
        const arrowColor = selected ? SELECTED_COLOR : strokeColor;
        drawArrowHead(ctx, lastSeg.end, lastSeg.cp2, arrowColor, strokeWidth, arrowType);
    }

    if (selected && anchors.length > 0) {
        drawCatmullRomAnchors(ctx, anchors);
    }

    if (label && !hideLabel) {
        const midIdx = Math.floor(segments.length / 2);
        const midSeg = segments[midIdx]!;
        const midPoint = getBezierPoint(0.5, midSeg.start, midSeg.cp1, midSeg.cp2, midSeg.end);
        drawLabel(ctx, midPoint, label, selected, strokeColor);
    }
}

function drawCatmullRomAnchors(ctx: CanvasRenderingContext2D, anchors: IntermediateAnchor[]): void {
    ctx.fillStyle = SELECTED_COLOR;
    ctx.strokeStyle = HANDLE_FILL_COLOR;
    ctx.lineWidth = 2;

    for (const anchor of anchors) {
        ctx.beginPath();
        ctx.arc(anchor.position.x, anchor.position.y, ANCHOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

function drawArrowHead(ctx: CanvasRenderingContext2D, tip: Point, controlPoint: Point, color: string, strokeWidth: number, arrowType: ArrowType): void {
    const angle = Math.atan2(tip.y - controlPoint.y, tip.x - controlPoint.x);
    const extendedTip = {
        x: tip.x + ARROW_TIP_EXTENSION * Math.cos(angle),
        y: tip.y + ARROW_TIP_EXTENSION * Math.sin(angle)
    };

    const left = {
        x: extendedTip.x - ARROW_LENGTH * Math.cos(angle - ARROW_ANGLE),
        y: extendedTip.y - ARROW_LENGTH * Math.sin(angle - ARROW_ANGLE)
    };
    const right = {
        x: extendedTip.x - ARROW_LENGTH * Math.cos(angle + ARROW_ANGLE),
        y: extendedTip.y - ARROW_LENGTH * Math.sin(angle + ARROW_ANGLE)
    };

    ctx.save();

    if (arrowType === 'line') {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(extendedTip.x, extendedTip.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
    } else if (arrowType === 'outline') {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.fillStyle = HANDLE_FILL_COLOR;
        ctx.beginPath();
        ctx.moveTo(extendedTip.x, extendedTip.y);
        ctx.lineTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(extendedTip.x, extendedTip.y);
        ctx.lineTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}
