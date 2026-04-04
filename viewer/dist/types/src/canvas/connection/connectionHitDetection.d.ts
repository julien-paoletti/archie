/**
 * Connection Hit Detection
 * Point-in-curve and control point hit testing
 */
import type { Point, IntermediateAnchor } from '../types';
import type { BezierSegment } from './catmullRomMath';
export declare function containsPointOnCurve(px: number, py: number, sourcePos: Point, sourceControl: Point, targetControl: Point, targetPos: Point, threshold: number): boolean;
export declare function containsPointOnMultiSegment(px: number, py: number, sourcePos: Point, targetPos: Point, firstOutHandle: Point, lastInHandle: Point, intermediateAnchors: IntermediateAnchor[], threshold: number): boolean;
export declare function containsPointOnSegments(px: number, py: number, segments: BezierSegment[], threshold: number): boolean;
export declare function findControlPointAtPosition(px: number, py: number, sourceControl: Point, targetControl: Point, threshold: number): 'source' | 'target' | null;
export declare function findAnchorAtPosition(px: number, py: number, anchors: IntermediateAnchor[], threshold: number): number | null;
export declare function findAnchorHandleAtPosition(px: number, py: number, anchors: IntermediateAnchor[], threshold: number): {
    anchorIndex: number;
    handleType: 'in' | 'out';
} | null;
