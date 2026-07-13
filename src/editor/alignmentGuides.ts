/**
 * Alignment Guides ("smart guides")
 *
 * While dragging, the moving element's edges and centers are compared against
 * every stationary element. Within ALIGNMENT_THRESHOLD world-px the drag
 * snaps to the alignment, and matching alignments are drawn as guide lines.
 *
 * The core functions are pure (bounds in, deltas/guides out) so they are
 * unit-testable without a canvas.
 */

import type { Bounds } from '../canvas/index';

/** Max distance (world px) at which an edge/center magnetically snaps. */
export const ALIGNMENT_THRESHOLD = 6;

/** Padding added past both elements' extents when drawing a guide line. */
const GUIDE_MARGIN = 8;

export interface AlignmentGuide {
    axis: 'vertical' | 'horizontal';
    /** World coordinate of the line (x for vertical, y for horizontal). */
    position: number;
    /** Extent of the line along its axis (y-range for vertical, x-range for horizontal). */
    start: number;
    end: number;
}

/** The three interesting x-stops of a bounds: left, center, right. */
function xStops(b: Bounds): number[] {
    return [b.x, b.x + b.width / 2, b.x + b.width];
}

/** The three interesting y-stops of a bounds: top, middle, bottom. */
function yStops(b: Bounds): number[] {
    return [b.y, b.y + b.height / 2, b.y + b.height];
}

/**
 * Find the smallest per-axis correction (within threshold) that aligns the
 * moving bounds with any target. Returns null for an axis with no candidate.
 */
export function findAlignmentSnap(
    moving: Bounds,
    targets: Bounds[],
    threshold: number = ALIGNMENT_THRESHOLD
): { dx: number | null; dy: number | null } {
    let dx: number | null = null;
    let dy: number | null = null;

    for (const t of targets) {
        for (const m of xStops(moving)) {
            for (const s of xStops(t)) {
                const d = s - m;
                if (Math.abs(d) <= threshold && (dx === null || Math.abs(d) < Math.abs(dx))) dx = d;
            }
        }
        for (const m of yStops(moving)) {
            for (const s of yStops(t)) {
                const d = s - m;
                if (Math.abs(d) <= threshold && (dy === null || Math.abs(d) < Math.abs(dy))) dy = d;
            }
        }
    }

    return { dx, dy };
}

/**
 * Collect guide lines for every stop of `bounds` that exactly aligns with a
 * target stop (post-snap). Guides at the same position merge their extents,
 * so one line spans all aligned neighbors.
 */
export function collectExactGuides(bounds: Bounds, targets: Bounds[]): AlignmentGuide[] {
    const EPS = 0.5;
    const merged = new Map<string, AlignmentGuide>();

    const addGuide = (axis: 'vertical' | 'horizontal', position: number, start: number, end: number) => {
        const key = `${axis}:${Math.round(position * 2)}`;
        const existing = merged.get(key);
        if (existing) {
            existing.start = Math.min(existing.start, start);
            existing.end = Math.max(existing.end, end);
        } else {
            merged.set(key, { axis, position, start, end });
        }
    };

    for (const t of targets) {
        for (const m of xStops(bounds)) {
            for (const s of xStops(t)) {
                if (Math.abs(m - s) < EPS) {
                    addGuide(
                        'vertical', s,
                        Math.min(bounds.y, t.y) - GUIDE_MARGIN,
                        Math.max(bounds.y + bounds.height, t.y + t.height) + GUIDE_MARGIN
                    );
                }
            }
        }
        for (const m of yStops(bounds)) {
            for (const s of yStops(t)) {
                if (Math.abs(m - s) < EPS) {
                    addGuide(
                        'horizontal', s,
                        Math.min(bounds.x, t.x) - GUIDE_MARGIN,
                        Math.max(bounds.x + bounds.width, t.x + t.width) + GUIDE_MARGIN
                    );
                }
            }
        }
    }

    return [...merged.values()];
}
