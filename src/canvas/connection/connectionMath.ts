/**
 * Connection Math Utilities
 * Bezier curve calculations, control points, and geometry helpers
 */

import type { Point } from '../types';

export function getControlPoint(point: Point, side: string, distance: number): Point {
    switch (side) {
        case 'top': return { x: point.x, y: point.y - distance };
        case 'bottom': return { x: point.x, y: point.y + distance };
        case 'left': return { x: point.x - distance, y: point.y };
        case 'right': return { x: point.x + distance, y: point.y };
        default: return point;
    }
}

export function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
}

export function lerp(p0: Point, p1: Point, t: number): Point {
    return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t
    };
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function controlDistance(p1: Point, p2: Point): number {
    return Math.min(100, Math.abs(p2.x - p1.x) / 2 + Math.abs(p2.y - p1.y) / 2);
}

export function splitCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): {
    segment1: { start: Point; control1: Point; control2: Point; end: Point };
    segment2: { start: Point; control1: Point; control2: Point; end: Point };
} {
    const p01 = lerp(p0, p1, t);
    const p12 = lerp(p1, p2, t);
    const p23 = lerp(p2, p3, t);
    const p012 = lerp(p01, p12, t);
    const p123 = lerp(p12, p23, t);
    const p0123 = lerp(p012, p123, t);

    return {
        segment1: { start: p0, control1: p01, control2: p012, end: p0123 },
        segment2: { start: p0123, control1: p123, control2: p23, end: p3 }
    };
}

export function findClosestPointOnCurve(clickPos: Point, p0: Point, p1: Point, p2: Point, p3: Point): { t: number; point: Point } {
    let minDist = Infinity;
    let closestT = 0.5;
    let closestPoint = getBezierPoint(0.5, p0, p1, p2, p3);

    const samples = 50;
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const point = getBezierPoint(t, p0, p1, p2, p3);
        const dist = Math.sqrt((clickPos.x - point.x) ** 2 + (clickPos.y - point.y) ** 2);

        if (dist < minDist) {
            minDist = dist;
            closestT = t;
            closestPoint = point;
        }
    }

    return { t: closestT, point: closestPoint };
}
