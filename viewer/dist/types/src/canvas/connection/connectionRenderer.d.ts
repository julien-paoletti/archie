/**
 * Connection Renderer
 * Handles all drawing logic for connections
 */
import type { Point, IntermediateAnchor, ArrowType, CurveType } from '../types';
import type { BezierSegment } from './catmullRomMath';
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
export declare function drawSingleSegment(ctx: CanvasRenderingContext2D, data: ConnectionDrawData): void;
export declare function drawMultiSegment(ctx: CanvasRenderingContext2D, data: ConnectionDrawData, intermediateAnchors: IntermediateAnchor[], firstOutHandle: Point, lastInHandle: Point): void;
export declare function drawCatmullRomConnection(ctx: CanvasRenderingContext2D, data: ConnectionDrawData, segments: BezierSegment[], anchors: IntermediateAnchor[]): void;
