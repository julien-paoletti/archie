/**
 * Unit tests for connection bezier math.
 * These are pure functions — the geometry that ships in the published viewer.
 */

import { describe, expect, test } from 'bun:test';
import {
    controlDistance,
    distance,
    findClosestPointOnCurve,
    getBezierPoint,
    getControlPoint,
    lerp,
    splitCubicBezier
} from '../src/canvas/connection/connectionMath';
import type { Point } from '../src/canvas/types';

const p = (x: number, y: number): Point => ({ x, y });

// Bezier evaluated at t must match the point produced by de Casteljau splitting.
function closeTo(a: Point, b: Point, eps = 1e-9): void {
    expect(Math.abs(a.x - b.x)).toBeLessThan(eps);
    expect(Math.abs(a.y - b.y)).toBeLessThan(eps);
}

describe('getControlPoint', () => {
    test('offsets along the correct axis for each side', () => {
        const pt = p(10, 20);
        expect(getControlPoint(pt, 'top', 5)).toEqual(p(10, 15));
        expect(getControlPoint(pt, 'bottom', 5)).toEqual(p(10, 25));
        expect(getControlPoint(pt, 'left', 5)).toEqual(p(5, 20));
        expect(getControlPoint(pt, 'right', 5)).toEqual(p(15, 20));
    });

    test('unknown side returns the point unchanged', () => {
        const pt = p(3, 4);
        expect(getControlPoint(pt, 'diagonal', 5)).toBe(pt);
    });
});

describe('getBezierPoint', () => {
    const p0 = p(0, 0);
    const p1 = p(0, 10);
    const p2 = p(10, 10);
    const p3 = p(10, 0);

    test('t=0 returns the start anchor', () => {
        closeTo(getBezierPoint(0, p0, p1, p2, p3), p0);
    });

    test('t=1 returns the end anchor', () => {
        closeTo(getBezierPoint(1, p0, p1, p2, p3), p3);
    });

    test('t=0.5 is the geometric midpoint of this symmetric curve', () => {
        // For these control points the curve is symmetric about x=5.
        closeTo(getBezierPoint(0.5, p0, p1, p2, p3), p(5, 7.5));
    });

    test('degenerate curve (all points equal) stays put', () => {
        closeTo(getBezierPoint(0.37, p0, p0, p0, p0), p0);
    });
});

describe('lerp', () => {
    test('endpoints and midpoint', () => {
        expect(lerp(p(0, 0), p(10, 20), 0)).toEqual(p(0, 0));
        expect(lerp(p(0, 0), p(10, 20), 1)).toEqual(p(10, 20));
        expect(lerp(p(0, 0), p(10, 20), 0.5)).toEqual(p(5, 10));
    });

    test('extrapolates past the segment for t outside [0,1]', () => {
        expect(lerp(p(0, 0), p(10, 0), 2)).toEqual(p(20, 0));
    });
});

describe('distance', () => {
    test('classic 3-4-5 triangle', () => {
        expect(distance(0, 0, 3, 4)).toBe(5);
    });

    test('zero distance for identical points', () => {
        expect(distance(7, 7, 7, 7)).toBe(0);
    });
});

describe('controlDistance', () => {
    test('is half the Manhattan distance below the cap', () => {
        // |40-0|/2 + |30-0|/2 = 20 + 15 = 35
        expect(controlDistance(p(0, 0), p(40, 30))).toBe(35);
    });

    test('is capped at 100 for far-apart points', () => {
        expect(controlDistance(p(0, 0), p(1000, 1000))).toBe(100);
    });

    test('is zero for coincident points', () => {
        expect(controlDistance(p(5, 5), p(5, 5))).toBe(0);
    });
});

describe('splitCubicBezier', () => {
    const p0 = p(0, 0);
    const p1 = p(0, 10);
    const p2 = p(10, 10);
    const p3 = p(10, 0);

    test('the two segments join at the split point', () => {
        const { segment1, segment2 } = splitCubicBezier(p0, p1, p2, p3, 0.5);
        closeTo(segment1.end, segment2.start);
    });

    test('split point equals getBezierPoint at the same t', () => {
        const t = 0.3;
        const { segment1 } = splitCubicBezier(p0, p1, p2, p3, t);
        closeTo(segment1.end, getBezierPoint(t, p0, p1, p2, p3));
    });

    test('endpoints are preserved', () => {
        const { segment1, segment2 } = splitCubicBezier(p0, p1, p2, p3, 0.42);
        closeTo(segment1.start, p0);
        closeTo(segment2.end, p3);
    });
});

describe('findClosestPointOnCurve', () => {
    const p0 = p(0, 0);
    const p1 = p(0, 10);
    const p2 = p(10, 10);
    const p3 = p(10, 0);

    test('a click on an anchor returns t near that anchor', () => {
        const { t } = findClosestPointOnCurve(p0, p0, p1, p2, p3);
        expect(t).toBeLessThan(0.05);
    });

    test('the returned point actually lies on the curve at the returned t', () => {
        const { t, point } = findClosestPointOnCurve(p(5, 8), p0, p1, p2, p3);
        closeTo(point, getBezierPoint(t, p0, p1, p2, p3), 1e-9);
    });

    test('t is always within [0,1]', () => {
        const { t } = findClosestPointOnCurve(p(-100, -100), p0, p1, p2, p3);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
    });
});
