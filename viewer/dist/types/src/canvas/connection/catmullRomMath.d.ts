/**
 * Catmull-Rom Math Utilities
 * Converts Catmull-Rom spline points to cubic Bezier control points
 */
import type { Point, IntermediateAnchor } from '../types';
export interface BezierSegment {
    start: Point;
    cp1: Point;
    cp2: Point;
    end: Point;
}
/**
 * For a Catmull-Rom segment from P1 to P2 with neighbors P0 and P3,
 * compute the equivalent cubic Bezier control points.
 * Formula: cp1 = P1 + (P2 - P0) / 6, cp2 = P2 - (P3 - P1) / 6
 */
export declare function catmullRomToBezierControls(p0: Point, p1: Point, p2: Point, p3: Point): {
    cp1: Point;
    cp2: Point;
};
/**
 * Build the full chain of points for Catmull-Rom conversion.
 * Returns [phantom, source, ...anchors, target, phantom].
 * Phantom points are reflections of the nearest neighbor around the endpoint.
 */
export declare function buildCatmullRomPointChain(sourcePos: Point, targetPos: Point, anchors: IntermediateAnchor[]): Point[];
/**
 * Given a Catmull-Rom point chain (with phantoms at both ends),
 * compute Bezier segments. Each consecutive group of 4 points
 * [chain[i-1], chain[i], chain[i+1], chain[i+2]] produces one segment
 * from chain[i] to chain[i+1].
 */
export declare function catmullRomSegments(chain: Point[]): BezierSegment[];
