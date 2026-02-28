/**
 * Connection Class
 * Represents a connection between two diagram components
 */

import type { DiagramElement } from '../diagramElement';
import type { ConnectionOptions, ConnectionPoint, Point, IntermediateAnchor, LineStyle, ArrowType, CurveType } from '../types';
import { getControlPoint, getBezierPoint, controlDistance, distance, splitCubicBezier, findClosestPointOnCurve } from './connectionMath';
import { drawSingleSegment, drawMultiSegment, drawCatmullRomConnection } from './connectionRenderer';
import { containsPointOnCurve, containsPointOnMultiSegment, containsPointOnSegments, findControlPointAtPosition, findAnchorAtPosition, findAnchorHandleAtPosition } from './connectionHitDetection';
import { buildCatmullRomPointChain, catmullRomSegments } from './catmullRomMath';

export class Connection {
    public id: string;
    public sourcePoint: ConnectionPoint;
    public targetPoint: ConnectionPoint;
    public strokeColor: string;
    public strokeWidth: number;
    public selected: boolean = false;
    public label: string = '';
    public hideLabel: boolean = false;
    public lineStyle: LineStyle = 'solid';
    public arrowType: ArrowType = 'filled';
    public curveType: CurveType = 'bezier';
    public customControlPoint1: Point | null = null;
    public customControlPoint2: Point | null = null;
    public intermediateAnchors: IntermediateAnchor[] = [];

    constructor(options: ConnectionOptions) {
        this.id = options.id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        this.sourcePoint = { ...options.sourcePoint };
        this.targetPoint = { ...options.targetPoint };
        this.strokeColor = options.strokeColor ?? '#64748B';
        this.strokeWidth = options.strokeWidth ?? 2;
        this.label = options.label ?? '';
        this.lineStyle = options.lineStyle ?? 'solid';
        this.arrowType = options.arrowType ?? 'filled';
        this.curveType = options.curveType ?? 'bezier';
        this.customControlPoint1 = options.customControlPoint1 ? { ...options.customControlPoint1 } : null;
        this.customControlPoint2 = options.customControlPoint2 ? { ...options.customControlPoint2 } : null;
        this.intermediateAnchors = options.intermediateAnchors?.map(anchor => ({
            position: { ...anchor.position },
            handleIn: { ...anchor.handleIn },
            handleOut: { ...anchor.handleOut }
        })) ?? [];
    }

    private getLineDash(): number[] {
        switch (this.lineStyle) {
            case 'dashed': return [8, 4];
            case 'dotted': return [2, 4];
            default: return [];
        }
    }

    private getActualControlPoints(sourcePos: Point, targetPos: Point): { sourceControl: Point; targetControl: Point } {
        const dist = controlDistance(sourcePos, targetPos);
        return {
            sourceControl: this.customControlPoint1 ?? getControlPoint(sourcePos, this.sourcePoint.side, dist),
            targetControl: this.customControlPoint2 ?? getControlPoint(targetPos, this.targetPoint.side, dist)
        };
    }

    private resolveEndpoints(components: DiagramElement[]): { sourcePos: Point; targetPos: Point } | null {
        const src = components.find(c => c.id === this.sourcePoint.componentId);
        const tgt = components.find(c => c.id === this.targetPoint.componentId);
        if (!src || !tgt) return null;
        return {
            sourcePos: src.getPointOnBorder(this.sourcePoint.side, this.sourcePoint.offset),
            targetPos: tgt.getPointOnBorder(this.targetPoint.side, this.targetPoint.offset)
        };
    }

    private getMultiSegmentHandles(sourcePos: Point, targetPos: Point): { firstOutHandle: Point; lastInHandle: Point } {
        const dist = controlDistance(sourcePos, this.intermediateAnchors[0]!.position);
        return {
            firstOutHandle: this.customControlPoint1 ?? getControlPoint(sourcePos, this.sourcePoint.side, dist),
            lastInHandle: this.customControlPoint2 ?? getControlPoint(targetPos, this.targetPoint.side, dist)
        };
    }

    draw(ctx: CanvasRenderingContext2D, components: DiagramElement[]): void {
        const endpoints = this.resolveEndpoints(components);
        if (!endpoints) return;

        const { sourcePos, targetPos } = endpoints;
        ctx.save();

        const drawData = {
            sourcePos, targetPos,
            ...this.getActualControlPoints(sourcePos, targetPos),
            strokeColor: this.strokeColor, strokeWidth: this.strokeWidth,
            selected: this.selected, lineDash: this.getLineDash(),
            arrowType: this.arrowType, curveType: this.curveType,
            label: this.label, hideLabel: this.hideLabel
        };

        if (this.curveType === 'catmull-rom') {
            const chain = buildCatmullRomPointChain(sourcePos, targetPos, this.intermediateAnchors);
            const segments = catmullRomSegments(chain);
            drawCatmullRomConnection(ctx, drawData, segments, this.intermediateAnchors);
        } else if (this.intermediateAnchors.length > 0) {
            const { firstOutHandle, lastInHandle } = this.getMultiSegmentHandles(sourcePos, targetPos);
            drawMultiSegment(ctx, drawData, this.intermediateAnchors, firstOutHandle, lastInHandle);
        } else {
            drawSingleSegment(ctx, drawData);
        }

        ctx.restore();
    }

    getMidpoint(components: DiagramElement[]): Point | null {
        const endpoints = this.resolveEndpoints(components);
        if (!endpoints) return null;
        const { sourcePos, targetPos } = endpoints;

        if (this.curveType === 'catmull-rom') {
            const chain = buildCatmullRomPointChain(sourcePos, targetPos, this.intermediateAnchors);
            const segments = catmullRomSegments(chain);
            const midSeg = segments[Math.floor(segments.length / 2)]!;
            return getBezierPoint(0.5, midSeg.start, midSeg.cp1, midSeg.cp2, midSeg.end);
        }

        const { sourceControl, targetControl } = this.getActualControlPoints(sourcePos, targetPos);
        return getBezierPoint(0.5, sourcePos, sourceControl, targetControl, targetPos);
    }

    getControlPointAtPosition(px: number, py: number, components: DiagramElement[], threshold: number = 10): 'source' | 'target' | null {
        if (!this.selected || this.curveType === 'catmull-rom') return null;
        const endpoints = this.resolveEndpoints(components);
        if (!endpoints) return null;
        const { sourcePos, targetPos } = endpoints;

        let sourceControl: Point;
        let targetControl: Point;

        if (this.intermediateAnchors.length > 0) {
            const handles = this.getMultiSegmentHandles(sourcePos, targetPos);
            sourceControl = handles.firstOutHandle;
            targetControl = handles.lastInHandle;
        } else {
            const points = this.getActualControlPoints(sourcePos, targetPos);
            sourceControl = points.sourceControl;
            targetControl = points.targetControl;
        }

        return findControlPointAtPosition(px, py, sourceControl, targetControl, threshold);
    }

    getIntermediateAnchorAtPosition(px: number, py: number, threshold: number = 10): number | null {
        if (!this.selected || this.intermediateAnchors.length === 0) return null;
        return findAnchorAtPosition(px, py, this.intermediateAnchors, threshold);
    }

    getIntermediateAnchorHandleAtPosition(px: number, py: number, threshold: number = 10): { anchorIndex: number; handleType: 'in' | 'out' } | null {
        if (!this.selected || this.intermediateAnchors.length === 0 || this.curveType === 'catmull-rom') return null;
        return findAnchorHandleAtPosition(px, py, this.intermediateAnchors, threshold);
    }

    containsPoint(px: number, py: number, components: DiagramElement[], threshold: number = 8): boolean {
        const endpoints = this.resolveEndpoints(components);
        if (!endpoints) return false;
        const { sourcePos, targetPos } = endpoints;

        if (this.curveType === 'catmull-rom') {
            const chain = buildCatmullRomPointChain(sourcePos, targetPos, this.intermediateAnchors);
            const segments = catmullRomSegments(chain);
            return containsPointOnSegments(px, py, segments, threshold);
        }

        if (this.intermediateAnchors.length > 0) {
            const { firstOutHandle, lastInHandle } = this.getMultiSegmentHandles(sourcePos, targetPos);
            return containsPointOnMultiSegment(px, py, sourcePos, targetPos, firstOutHandle, lastInHandle, this.intermediateAnchors, threshold);
        }

        const { sourceControl, targetControl } = this.getActualControlPoints(sourcePos, targetPos);
        return containsPointOnCurve(px, py, sourcePos, sourceControl, targetControl, targetPos, threshold);
    }

    addIntermediateAnchor(clickPos: Point, components: DiagramElement[]): void {
        const endpoints = this.resolveEndpoints(components);
        if (!endpoints) return;
        const { sourcePos, targetPos } = endpoints;

        if (this.curveType === 'catmull-rom') {
            const chain = buildCatmullRomPointChain(sourcePos, targetPos, this.intermediateAnchors);
            const segments = catmullRomSegments(chain);
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < segments.length; i++) {
                const { point } = findClosestPointOnCurve(clickPos, segments[i]!.start, segments[i]!.cp1, segments[i]!.cp2, segments[i]!.end);
                const d = distance(clickPos.x, clickPos.y, point.x, point.y);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            this.intermediateAnchors.splice(bestIdx, 0, {
                position: { ...clickPos },
                handleIn: { ...clickPos },
                handleOut: { ...clickPos }
            });
            return;
        }

        if (this.intermediateAnchors.length === 0) {
            const { sourceControl, targetControl } = this.getActualControlPoints(sourcePos, targetPos);
            const { t, point } = findClosestPointOnCurve(clickPos, sourcePos, sourceControl, targetControl, targetPos);
            const split = splitCubicBezier(sourcePos, sourceControl, targetControl, targetPos, t);

            this.intermediateAnchors.push({
                position: point,
                handleIn: split.segment1.control2,
                handleOut: split.segment2.control1
            });
            this.customControlPoint1 = split.segment1.control1;
            this.customControlPoint2 = split.segment2.control2;
        } else {
            const lastAnchor = this.intermediateAnchors[this.intermediateAnchors.length - 1]!;
            const dx = clickPos.x - lastAnchor.position.x;
            const dy = clickPos.y - lastAnchor.position.y;

            this.intermediateAnchors.push({
                position: { ...clickPos },
                handleIn: { x: clickPos.x - dx * 0.3, y: clickPos.y - dy * 0.3 },
                handleOut: { x: clickPos.x + dx * 0.3, y: clickPos.y + dy * 0.3 }
            });
        }
    }

    toJSON(): ConnectionOptions {
        const json: ConnectionOptions = {
            id: this.id,
            sourcePoint: { ...this.sourcePoint },
            targetPoint: { ...this.targetPoint },
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            label: this.label,
            lineStyle: this.lineStyle,
            arrowType: this.arrowType
        };

        if (this.curveType !== 'bezier') json.curveType = this.curveType;
        if (this.customControlPoint1) json.customControlPoint1 = { ...this.customControlPoint1 };
        if (this.customControlPoint2) json.customControlPoint2 = { ...this.customControlPoint2 };

        if (this.intermediateAnchors.length > 0) {
            json.intermediateAnchors = this.intermediateAnchors.map(anchor => ({
                position: { ...anchor.position },
                handleIn: { ...anchor.handleIn },
                handleOut: { ...anchor.handleOut }
            }));
        }

        return json;
    }
}
