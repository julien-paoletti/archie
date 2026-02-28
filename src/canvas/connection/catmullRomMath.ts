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
export function catmullRomToBezierControls(
    p0: Point, p1: Point, p2: Point, p3: Point
): { cp1: Point; cp2: Point } {
    return {
        cp1: {
            x: p1.x + (p2.x - p0.x) / 6,
            y: p1.y + (p2.y - p0.y) / 6
        },
        cp2: {
            x: p2.x - (p3.x - p1.x) / 6,
            y: p2.y - (p3.y - p1.y) / 6
        }
    };
}

/**
 * Build the full chain of points for Catmull-Rom conversion.
 * Returns [phantom, source, ...anchors, target, phantom].
 * Phantom points are reflections of the nearest neighbor around the endpoint.
 */
export function buildCatmullRomPointChain(
    sourcePos: Point,
    targetPos: Point,
    anchors: IntermediateAnchor[]
): Point[] {
    const points: Point[] = [sourcePos];
    for (const anchor of anchors) {
        points.push(anchor.position);
    }
    points.push(targetPos);

    const first = points[0]!;
    const second = points[1]!;
    const phantomStart: Point = {
        x: 2 * first.x - second.x,
        y: 2 * first.y - second.y
    };

    const last = points[points.length - 1]!;
    const secondLast = points[points.length - 2]!;
    const phantomEnd: Point = {
        x: 2 * last.x - secondLast.x,
        y: 2 * last.y - secondLast.y
    };

    return [phantomStart, ...points, phantomEnd];
}

/**
 * Given a Catmull-Rom point chain (with phantoms at both ends),
 * compute Bezier segments. Each consecutive group of 4 points
 * [chain[i-1], chain[i], chain[i+1], chain[i+2]] produces one segment
 * from chain[i] to chain[i+1].
 */
export function catmullRomSegments(chain: Point[]): BezierSegment[] {
    const segments: BezierSegment[] = [];
    for (let i = 1; i < chain.length - 2; i++) {
        const { cp1, cp2 } = catmullRomToBezierControls(
            chain[i - 1]!, chain[i]!, chain[i + 1]!, chain[i + 2]!
        );
        segments.push({
            start: chain[i]!,
            cp1,
            cp2,
            end: chain[i + 1]!
        });
    }
    return segments;
}
