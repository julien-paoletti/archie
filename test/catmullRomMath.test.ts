/**
 * Unit tests for Catmull-Rom → Bezier conversion.
 * Catmull-Rom curves must pass THROUGH each anchor position — that's the
 * defining property, and the property these tests lock down.
 */

import { describe, expect, test } from 'bun:test';
import {
    buildCatmullRomPointChain,
    catmullRomSegments,
    catmullRomToBezierControls
} from '../src/canvas/connection/catmullRomMath';
import { getBezierPoint } from '../src/canvas/connection/connectionMath';
import type { IntermediateAnchor, Point } from '../src/canvas/types';

const p = (x: number, y: number): Point => ({ x, y });

// Build a minimal anchor; only `position` matters for chain construction.
const anchorAt = (x: number, y: number): IntermediateAnchor => ({
    position: p(x, y),
    handleIn: p(x, y),
    handleOut: p(x, y)
});

function closeTo(a: Point, b: Point, eps = 1e-9): void {
    expect(Math.abs(a.x - b.x)).toBeLessThan(eps);
    expect(Math.abs(a.y - b.y)).toBeLessThan(eps);
}

describe('catmullRomToBezierControls', () => {
    test('matches the documented formula cp1=P1+(P2-P0)/6, cp2=P2-(P3-P1)/6', () => {
        const p0 = p(0, 0);
        const p1 = p(6, 0);
        const p2 = p(12, 6);
        const p3 = p(18, 6);
        const { cp1, cp2 } = catmullRomToBezierControls(p0, p1, p2, p3);
        closeTo(cp1, p(6 + (12 - 0) / 6, 0 + (6 - 0) / 6)); // (8, 1)
        closeTo(cp2, p(12 - (18 - 6) / 6, 6 - (6 - 0) / 6)); // (10, 5)
    });

    test('collinear evenly-spaced points give collinear controls', () => {
        const { cp1, cp2 } = catmullRomToBezierControls(p(0, 0), p(1, 0), p(2, 0), p(3, 0));
        expect(cp1.y).toBe(0);
        expect(cp2.y).toBe(0);
    });
});

describe('buildCatmullRomPointChain', () => {
    test('inserts phantom endpoints so length = anchors + 4', () => {
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), [anchorAt(10, 5), anchorAt(20, 5)]);
        // phantom + source + 2 anchors + target + phantom = 6
        expect(chain.length).toBe(6);
    });

    test('real points sit between the phantoms in order', () => {
        const source = p(0, 0);
        const target = p(30, 0);
        const chain = buildCatmullRomPointChain(source, target, [anchorAt(10, 5)]);
        expect(chain[1]).toEqual(source);
        expect(chain[2]).toEqual(p(10, 5));
        expect(chain[3]).toEqual(target);
    });

    test('phantom start reflects the second point about the source', () => {
        // phantom = 2*first - second
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), [anchorAt(10, 6)]);
        expect(chain[0]).toEqual(p(2 * 0 - 10, 2 * 0 - 6)); // (-10, -6)
    });

    test('phantom end reflects the second-to-last point about the target', () => {
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), [anchorAt(10, 6)]);
        const last = chain[chain.length - 1]!;
        // second-last real point is target (30,0); the one before it is (10,6)
        expect(last).toEqual(p(2 * 30 - 10, 2 * 0 - 6)); // (50, -6)
    });

    test('no anchors still yields a valid 4-point chain', () => {
        const chain = buildCatmullRomPointChain(p(0, 0), p(10, 0), []);
        expect(chain.length).toBe(4);
    });
});

describe('catmullRomSegments', () => {
    test('produces one segment per span between consecutive real points', () => {
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), [anchorAt(10, 5), anchorAt(20, 5)]);
        // real points: source, a1, a2, target → 3 spans
        const segments = catmullRomSegments(chain);
        expect(segments.length).toBe(3);
    });

    test('segments are contiguous — each ends where the next begins', () => {
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), [anchorAt(10, 5), anchorAt(20, 5)]);
        const segments = catmullRomSegments(chain);
        for (let i = 0; i < segments.length - 1; i++) {
            closeTo(segments[i]!.end, segments[i + 1]!.start);
        }
    });

    test('THE defining property: the curve passes through every anchor position', () => {
        const anchors = [anchorAt(10, 8), anchorAt(20, -4)];
        const chain = buildCatmullRomPointChain(p(0, 0), p(30, 0), anchors);
        const segments = catmullRomSegments(chain);

        // Segment 0 starts at source, segment 1 starts at anchor 0, etc.
        // A Bezier segment starts exactly at its `start` point (t=0),
        // so each anchor must be the start of the following segment.
        closeTo(segments[1]!.start, anchors[0]!.position);
        closeTo(segments[2]!.start, anchors[1]!.position);

        // And evaluating the previous segment at t=1 lands on the same anchor.
        closeTo(
            getBezierPoint(1, segments[0]!.start, segments[0]!.cp1, segments[0]!.cp2, segments[0]!.end),
            anchors[0]!.position
        );
    });

    test('first segment starts at the source, last ends at the target', () => {
        const chain = buildCatmullRomPointChain(p(1, 2), p(30, 40), [anchorAt(10, 5)]);
        const segments = catmullRomSegments(chain);
        closeTo(segments[0]!.start, p(1, 2));
        closeTo(segments[segments.length - 1]!.end, p(30, 40));
    });
});
