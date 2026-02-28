/**
 * Connection Hit Detection
 * Point-in-curve and control point hit testing
 */

import type { Point, IntermediateAnchor } from '../types';
import type { BezierSegment } from './catmullRomMath';
import { getBezierPoint, distance } from './connectionMath';

const HIT_DETECTION_STEPS = 20;

export function containsPointOnCurve(
    px: number,
    py: number,
    sourcePos: Point,
    sourceControl: Point,
    targetControl: Point,
    targetPos: Point,
    threshold: number
): boolean {
    for (let i = 0; i <= HIT_DETECTION_STEPS; i++) {
        const t = i / HIT_DETECTION_STEPS;
        const point = getBezierPoint(t, sourcePos, sourceControl, targetControl, targetPos);
        if (distance(px, py, point.x, point.y) <= threshold) {
            return true;
        }
    }
    return false;
}

export function containsPointOnMultiSegment(
    px: number,
    py: number,
    sourcePos: Point,
    targetPos: Point,
    firstOutHandle: Point,
    lastInHandle: Point,
    intermediateAnchors: IntermediateAnchor[],
    threshold: number
): boolean {
    // Check first segment
    for (let i = 0; i <= HIT_DETECTION_STEPS; i++) {
        const t = i / HIT_DETECTION_STEPS;
        const point = getBezierPoint(t, sourcePos, firstOutHandle, intermediateAnchors[0]!.handleIn, intermediateAnchors[0]!.position);
        if (distance(px, py, point.x, point.y) <= threshold) {
            return true;
        }
    }

    // Check middle segments
    for (let segmentIdx = 0; segmentIdx < intermediateAnchors.length - 1; segmentIdx++) {
        const anchor1 = intermediateAnchors[segmentIdx]!;
        const anchor2 = intermediateAnchors[segmentIdx + 1]!;

        for (let i = 0; i <= HIT_DETECTION_STEPS; i++) {
            const t = i / HIT_DETECTION_STEPS;
            const point = getBezierPoint(t, anchor1.position, anchor1.handleOut, anchor2.handleIn, anchor2.position);
            if (distance(px, py, point.x, point.y) <= threshold) {
                return true;
            }
        }
    }

    // Check last segment
    const lastAnchor = intermediateAnchors[intermediateAnchors.length - 1]!;
    for (let i = 0; i <= HIT_DETECTION_STEPS; i++) {
        const t = i / HIT_DETECTION_STEPS;
        const point = getBezierPoint(t, lastAnchor.position, lastAnchor.handleOut, lastInHandle, targetPos);
        if (distance(px, py, point.x, point.y) <= threshold) {
            return true;
        }
    }

    return false;
}

export function containsPointOnSegments(
    px: number,
    py: number,
    segments: BezierSegment[],
    threshold: number
): boolean {
    for (const seg of segments) {
        if (containsPointOnCurve(px, py, seg.start, seg.cp1, seg.cp2, seg.end, threshold)) {
            return true;
        }
    }
    return false;
}

export function findControlPointAtPosition(
    px: number,
    py: number,
    sourceControl: Point,
    targetControl: Point,
    threshold: number
): 'source' | 'target' | null {
    if (distance(px, py, sourceControl.x, sourceControl.y) <= threshold) return 'source';
    if (distance(px, py, targetControl.x, targetControl.y) <= threshold) return 'target';
    return null;
}

export function findAnchorAtPosition(
    px: number,
    py: number,
    anchors: IntermediateAnchor[],
    threshold: number
): number | null {
    for (let i = 0; i < anchors.length; i++) {
        if (distance(px, py, anchors[i]!.position.x, anchors[i]!.position.y) <= threshold) {
            return i;
        }
    }
    return null;
}

export function findAnchorHandleAtPosition(
    px: number,
    py: number,
    anchors: IntermediateAnchor[],
    threshold: number
): { anchorIndex: number; handleType: 'in' | 'out' } | null {
    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i]!;
        if (distance(px, py, anchor.handleIn.x, anchor.handleIn.y) <= threshold) {
            return { anchorIndex: i, handleType: 'in' };
        }
        if (distance(px, py, anchor.handleOut.x, anchor.handleOut.y) <= threshold) {
            return { anchorIndex: i, handleType: 'out' };
        }
    }
    return null;
}
