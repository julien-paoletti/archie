/**
 * Interaction Mode
 *
 * The editor is always in exactly one interaction mode. This discriminated
 * union replaces the previous soup of ~9 mutually-exclusive boolean flags
 * (isDragging, isResizing, isConnecting, ...) plus their loose companion
 * fields (draggedComponent, resizeHandle, slideConnection, ...).
 *
 * Folding each mode's data into its own variant makes illegal states
 * unrepresentable: you cannot be `resizing` without a handle, and you cannot
 * read `slideConnection` unless the mode is actually `slidingConnection`.
 *
 * Panning is deliberately NOT modelled here — it is orthogonal (triggered by
 * middle-mouse / space) and short-circuits before any of these modes engage.
 */

import type {
    Connection,
    ConnectionPoint,
    DiagramElement,
    Point,
    ResizeHandle
} from '../canvas/index';

export type InteractionMode =
    | { kind: 'idle' }
    | {
        kind: 'dragging';
        component: DiagramElement;
        offset: Point;
        startPos: Point | null;
        isClone: boolean;
    }
    | {
        kind: 'resizing';
        handle: NonNullable<ResizeHandle>;
        startPos: Point;
        startBounds: { x: number; y: number; width: number; height: number };
    }
    | {
        kind: 'boxSelect';
        start: Point;
        current: Point;
    }
    | {
        kind: 'connecting';
        source: ConnectionPoint;
        dragStartPos: Point | null;
    }
    | {
        kind: 'movingConnectionPoint';
        connection: Connection;
        end: 'source' | 'target';
    }
    | {
        kind: 'movingControlPoint';
        connection: Connection;
        pointType: 'source' | 'target';
    }
    | {
        kind: 'slidingConnection';
        connection: Connection;
        startY: number;
        sourceStart: ConnectionPoint;
        targetStart: ConnectionPoint;
    }
    | {
        kind: 'draggingAnchor';
        connection: Connection;
        index: number;
    }
    | {
        kind: 'draggingAnchorHandle';
        connection: Connection;
        index: number;
        handleType: 'in' | 'out';
    };

export type InteractionKind = InteractionMode['kind'];

/** The idle singleton — reused so re-entering idle doesn't allocate. */
export const IDLE: InteractionMode = { kind: 'idle' };

/**
 * True while a pointer-drag interaction is in progress. This drives auto-scroll
 * and off-canvas cursor/mouseUp handling.
 *
 * Note: `resizing` is deliberately excluded (matching the historical flag set) —
 * resize does not auto-scroll and is finalized only by an on-canvas mouseUp.
 * Only `idle` and `resizing` return false.
 */
export function isDragOperation(mode: InteractionMode): boolean {
    return mode.kind !== 'idle' && mode.kind !== 'resizing';
}
