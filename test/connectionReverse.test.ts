/**
 * Regression tests for Connection.reverse().
 *
 * Bug: reverse() swapped BOTH the endpoints and the arrow types. Since the
 * renderer draws `arrowType` at targetPoint and `sourceArrowType` at
 * sourcePoint, swapping both cancels out — the arrow head stays in the same
 * visual place and the connection looks unchanged ("nothing happens").
 *
 * Fix: swap endpoints (and per-end curve geometry) only; leave arrow types
 * bound to their visual ends so the head actually moves to the opposite end.
 */

import { describe, expect, test } from 'bun:test';
import { Connection } from '../src/canvas/connection/connection';
import type { ConnectionPoint, IntermediateAnchor } from '../src/canvas/types';

const point = (componentId: string): ConnectionPoint => ({
    x: 0, y: 0, componentId, side: 'right', offset: 0.5
});

describe('Connection.reverse()', () => {
    test('swaps source and target endpoints', () => {
        const conn = new Connection({ id: 'c', sourcePoint: point('A'), targetPoint: point('B') });
        conn.reverse();
        expect(conn.sourcePoint.componentId).toBe('B');
        expect(conn.targetPoint.componentId).toBe('A');
    });

    test('does NOT swap arrow types (so the head visibly moves ends)', () => {
        // Typical connection: filled head at target, none at source.
        const conn = new Connection({
            id: 'c', sourcePoint: point('A'), targetPoint: point('B'),
            arrowType: 'filled', sourceArrowType: 'none'
        });
        conn.reverse();
        // Arrow types stay put; only the endpoints moved. The renderer draws
        // arrowType at targetPoint (now A), so the head is now at A.
        expect(conn.arrowType).toBe('filled');
        expect(conn.sourceArrowType).toBe('none');
    });

    test('reversing twice returns to the original state', () => {
        const conn = new Connection({
            id: 'c', sourcePoint: point('A'), targetPoint: point('B'),
            arrowType: 'filled', sourceArrowType: 'none'
        });
        conn.reverse();
        conn.reverse();
        expect(conn.sourcePoint.componentId).toBe('A');
        expect(conn.targetPoint.componentId).toBe('B');
        expect(conn.arrowType).toBe('filled');
        expect(conn.sourceArrowType).toBe('none');
    });

    test('swaps the custom control points with the endpoints', () => {
        const conn = new Connection({
            id: 'c', sourcePoint: point('A'), targetPoint: point('B'),
            customControlPoint1: { x: 1, y: 1 },
            customControlPoint2: { x: 2, y: 2 }
        });
        conn.reverse();
        expect(conn.customControlPoint1).toEqual({ x: 2, y: 2 });
        expect(conn.customControlPoint2).toEqual({ x: 1, y: 1 });
    });

    test('reverses intermediate anchor order and swaps each anchor handle', () => {
        const anchors: IntermediateAnchor[] = [
            { position: { x: 10, y: 0 }, handleIn: { x: 9, y: 0 }, handleOut: { x: 11, y: 0 } },
            { position: { x: 20, y: 0 }, handleIn: { x: 19, y: 0 }, handleOut: { x: 21, y: 0 } }
        ];
        const conn = new Connection({
            id: 'c', sourcePoint: point('A'), targetPoint: point('B'),
            intermediateAnchors: anchors
        });
        conn.reverse();

        // Order reversed: the former last anchor (position x=20) comes first.
        expect(conn.intermediateAnchors[0]!.position.x).toBe(20);
        expect(conn.intermediateAnchors[1]!.position.x).toBe(10);
        // Each anchor's in/out handles are swapped so the curve keeps its shape.
        expect(conn.intermediateAnchors[0]!.handleIn.x).toBe(21);
        expect(conn.intermediateAnchors[0]!.handleOut.x).toBe(19);
    });
});
