/**
 * Tests for the smart-guide alignment core (pure geometry, no canvas).
 */

import { describe, expect, test } from 'bun:test';
import {
    ALIGNMENT_THRESHOLD,
    collectExactGuides,
    findAlignmentSnap
} from '../src/editor/alignmentGuides';

const box = (x: number, y: number, width = 100, height = 50) => ({ x, y, width, height });

describe('findAlignmentSnap', () => {
    test('snaps left edge to a target left edge within threshold', () => {
        // Moving box at x=104, target at x=100 → dx = -4
        const { dx } = findAlignmentSnap(box(104, 300), [box(100, 0)]);
        expect(dx).toBe(-4);
    });

    test('snaps centers, not just edges', () => {
        // Moving center = 154+50=204... use explicit: moving(100,300,100) center 150;
        // target(103,0,100) center 153 → dx = 3
        const { dx } = findAlignmentSnap(box(100, 300, 100), [box(103, 0, 100)]);
        expect(dx).toBe(3);
    });

    test('returns null outside the threshold', () => {
        const { dx, dy } = findAlignmentSnap(
            box(0, 0),
            [box(200 + ALIGNMENT_THRESHOLD + 1, 300 + ALIGNMENT_THRESHOLD + 1)]
        );
        expect(dx).toBeNull();
        expect(dy).toBeNull();
    });

    test('picks the nearest candidate when several are in range', () => {
        // Targets at x=105 (d=5) and x=102 (d=2) → snap to 102
        const { dx } = findAlignmentSnap(box(100, 300), [box(105, 0), box(102, 600)]);
        expect(dx).toBe(2);
    });

    test('axes snap independently', () => {
        // Horizontal alignment from one target, vertical from another
        const { dx, dy } = findAlignmentSnap(box(103, 204), [box(100, 900), box(900, 200)]);
        expect(dx).toBe(-3);
        expect(dy).toBe(-4);
    });

    test('right edge to left edge alignment (adjacent placement)', () => {
        // Moving right edge = 100+100=200; target left edge at 197 → dx=-3
        const { dx } = findAlignmentSnap(box(100, 300, 100), [box(197, 0, 100)]);
        expect(dx).toBe(-3);
    });
});

describe('collectExactGuides', () => {
    test('emits a vertical guide spanning both elements when left edges align', () => {
        const guides = collectExactGuides(box(100, 300), [box(100, 0)]);
        const vertical = guides.filter(g => g.axis === 'vertical');
        expect(vertical.length).toBeGreaterThan(0);
        const g = vertical.find(v => v.position === 100)!;
        expect(g).toBeDefined();
        // Spans from above the top element to below the bottom one
        expect(g.start).toBeLessThan(0);
        expect(g.end).toBeGreaterThan(350);
    });

    test('no guides when nothing aligns', () => {
        expect(collectExactGuides(box(0, 0), [box(500, 500)])).toEqual([]);
    });

    test('merges guides at the same position across multiple targets', () => {
        // Two targets both left-aligned at x=100 → one merged guide covering all three
        const guides = collectExactGuides(box(100, 300), [box(100, 0), box(100, 600, 100, 50)]);
        const at100 = guides.filter(g => g.axis === 'vertical' && g.position === 100);
        expect(at100.length).toBe(1);
        expect(at100[0]!.start).toBeLessThan(0);
        expect(at100[0]!.end).toBeGreaterThan(650);
    });

    test('near-misses beyond epsilon produce no guide', () => {
        const guides = collectExactGuides(box(102, 300), [box(100, 0)]);
        expect(guides.filter(g => g.axis === 'vertical' && g.position === 100)).toEqual([]);
    });
});
