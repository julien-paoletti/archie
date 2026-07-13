/**
 * Interaction-level tests.
 *
 * Drives the real handleMouseDown / handleMouseMove / handleMouseUp handlers
 * with synthetic events against a mock canvas (no DOM), asserting on the
 * InteractionMode state machine and the resulting element/connection state.
 * This is the layer where every reported bug in this project has lived —
 * these tests pin the gesture lifecycles end to end.
 *
 * Conventions: scale=1 and panOffset=(0,0), so world coords == client coords.
 * Pointer positions stay >50px inside the 800x600 canvas rect so the
 * auto-scroll path (requestAnimationFrame) never engages, and the world is
 * 5000x5000 so world-extension (canvas resizing) never triggers.
 */

import { describe, expect, test } from 'bun:test';
import { handleMouseDown } from '../src/editor/mouseHandler';
import { handleMouseMove } from '../src/editor/mouseMoveHandler';
import { handleMouseUp } from '../src/editor/mouseUpHandler';
import { IDLE } from '../src/editor/interactionMode';
import type { EditorState } from '../src/editor/editorState';
import { Module } from '../src/canvas/module';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function makeState(): EditorState {
    const canvas = {
        style: { cursor: 'default' },
        getBoundingClientRect: () => ({
            left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0
        })
    } as unknown as HTMLCanvasElement;

    return {
        canvas,
        container: {} as HTMLElement,
        canvasWorld: {} as HTMLElement,
        renderer: {} as EditorState['renderer'],
        ctx: {} as CanvasRenderingContext2D,
        elements: [],
        connections: [],
        selectedElements: [],
        selectedConnection: null,
        hoveredElement: null,
        worldWidth: 5000,
        worldHeight: 5000,
        gridSize: 24,
        snapToGrid: true,
        mode: IDLE,
        hoverConnectionPoint: null,
        alignmentGuides: [],
        potentialDropTarget: null,
        scale: 1,
        panOffset: { x: 0, y: 0 },
        isPanning: false,
        panStart: { x: 0, y: 0 },
        isSpacePressed: false,
        autoScrollAnimationId: null,
        lastScreenMousePos: { x: 0, y: 0 },
        mousePos: null,
        showCrosshair: false,
        nextDotNumber: 1,
        minimapCanvas: null,
        minimapCtx: null,
        minimapContainer: null,
        isDraggingMinimap: false
    };
}

function makeSpies() {
    const calls = { render: 0, saveState: 0, saveToStorage: 0 };
    const cb = {
        render: () => { calls.render++; },
        saveState: () => { calls.saveState++; },
        saveToStorage: () => { calls.saveToStorage++; }
    };
    return { calls, cb };
}

function ev(x: number, y: number, opts: Partial<MouseEvent> = {}): MouseEvent {
    return {
        clientX: x,
        clientY: y,
        button: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: () => {},
        ...opts
    } as unknown as MouseEvent;
}

/** Convenience wrapper matching handleMouseMove's callback-heavy signature. */
function move(state: EditorState, e: MouseEvent, render: () => void): void {
    handleMouseMove(state, e, render, () => null, () => null, () => null);
}

const moduleAt = (x: number, y: number) => new Module({ x, y, width: 192, height: 144, title: 'M' });

const borderPoint = (m: Module, side: 'left' | 'right', x: number, y: number) => ({
    point: { x, y },
    side: side as 'left' | 'right',
    offset: 0.5,
    componentId: m.id
});

// ---------------------------------------------------------------------------
// Dragging
// ---------------------------------------------------------------------------

describe('drag lifecycle', () => {
    test('mousedown on an element enters dragging mode, selects it, snapshots undo once', () => {
        const state = makeState();
        const m = moduleAt(96, 96);
        state.elements.push(m);
        const { calls, cb } = makeSpies();

        handleMouseDown(state, ev(150, 150), cb);

        expect(state.mode.kind).toBe('dragging');
        if (state.mode.kind === 'dragging') {
            expect(state.mode.component).toBe(m);
            expect(state.mode.offset).toEqual({ x: 54, y: 54 });
            expect(state.mode.isClone).toBe(false);
        }
        expect(state.selectedElements).toEqual([m]);
        expect(calls.saveState).toBe(1);
        expect((state.canvas.style as CSSStyleDeclaration).cursor).toBe('grabbing');
    });

    test('mousemove drags with grid snap; mouseup returns to idle and persists', () => {
        const state = makeState();
        const m = moduleAt(96, 96);
        state.elements.push(m);
        const { calls, cb } = makeSpies();

        handleMouseDown(state, ev(150, 150), cb);
        move(state, ev(250, 222), cb.render); // raw (196,168) → grid (192,168)

        expect(m.x).toBe(192);
        expect(m.y).toBe(168);
        expect(state.mode.kind).toBe('dragging');

        handleMouseUp(state, cb);

        expect(state.mode.kind).toBe('idle');
        expect(m.x).toBe(192);
        expect(m.y).toBe(168);
        expect(calls.saveToStorage).toBe(1);
        expect(state.alignmentGuides).toEqual([]);
    });

    test('dragging one of several selected elements moves them together', () => {
        const state = makeState();
        const m1 = moduleAt(96, 96);
        const m2 = moduleAt(384, 96);
        m1.selected = m2.selected = true;
        state.elements.push(m1, m2);
        state.selectedElements.push(m1, m2);
        const { cb } = makeSpies();

        handleMouseDown(state, ev(150, 150), cb); // on m1
        expect(state.selectedElements.length).toBe(2); // selection kept

        move(state, ev(246, 150), cb.render); // +96 x after grid snap

        expect(m1.x).toBe(192);
        expect(m2.x).toBe(480);
        expect(m1.y).toBe(96);
        expect(m2.y).toBe(96);

        handleMouseUp(state, cb);
        expect(state.mode.kind).toBe('idle');
    });
});

// ---------------------------------------------------------------------------
// Box selection
// ---------------------------------------------------------------------------

describe('box select lifecycle', () => {
    test('mousedown on empty canvas starts boxSelect; mouseup selects enclosed elements', () => {
        const state = makeState();
        const inside = moduleAt(288, 288);
        const outside = moduleAt(600, 96); // extends to x=792, outside the box
        state.elements.push(inside, outside);
        const { cb } = makeSpies();

        handleMouseDown(state, ev(60, 60), cb);
        expect(state.mode.kind).toBe('boxSelect');

        move(state, ev(550, 500), cb.render);
        if (state.mode.kind === 'boxSelect') {
            expect(state.mode.current).toEqual({ x: 550, y: 500 });
        }

        handleMouseUp(state, cb);

        expect(state.mode.kind).toBe('idle');
        expect(state.selectedElements).toContain(inside);
        expect(state.selectedElements).not.toContain(outside);
        expect(inside.selected).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Panning
// ---------------------------------------------------------------------------

describe('panning', () => {
    test('middle-button pans the viewport and persists on release', () => {
        const state = makeState();
        const { calls, cb } = makeSpies();

        handleMouseDown(state, ev(200, 200, { button: 1 }), cb);
        expect(state.isPanning).toBe(true);

        move(state, ev(260, 240), cb.render);
        expect(state.panOffset).toEqual({ x: 60, y: 40 });

        handleMouseUp(state, cb);
        expect(state.isPanning).toBe(false);
        expect(calls.saveToStorage).toBe(1);
    });

    test('space + left click also pans', () => {
        const state = makeState();
        state.isSpacePressed = true;
        const { cb } = makeSpies();

        handleMouseDown(state, ev(200, 200), cb);
        expect(state.isPanning).toBe(true);
        expect(state.mode.kind).toBe('idle'); // panning is orthogonal to the mode machine
    });
});

// ---------------------------------------------------------------------------
// Multi-select via shift-click
// ---------------------------------------------------------------------------

describe('shift-click selection toggle', () => {
    test('adds then removes an element without starting a drag or undo entry', () => {
        const state = makeState();
        const m = moduleAt(96, 96);
        state.elements.push(m);
        const { calls, cb } = makeSpies();

        handleMouseDown(state, ev(150, 150, { shiftKey: true }), cb);
        expect(state.selectedElements).toEqual([m]);
        expect(m.selected).toBe(true);
        expect(state.mode.kind).toBe('idle');
        expect(calls.saveState).toBe(0);

        handleMouseDown(state, ev(150, 150, { shiftKey: true }), cb);
        expect(state.selectedElements).toEqual([]);
        expect(m.selected).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Resizing
// ---------------------------------------------------------------------------

describe('resize lifecycle', () => {
    test('grabbing a corner handle resizes and returns to idle', () => {
        const state = makeState();
        const m = moduleAt(96, 96);
        m.selected = true;
        state.elements.push(m);
        state.selectedElements.push(m);
        const { calls, cb } = makeSpies();

        handleMouseDown(state, ev(96, 96), cb); // top-left handle
        expect(state.mode.kind).toBe('resizing');
        if (state.mode.kind === 'resizing') {
            expect(state.mode.handle).toBe('top-left');
            expect(state.mode.startBounds).toEqual({ x: 96, y: 96, width: 192, height: 144 });
        }
        expect(calls.saveState).toBe(1);

        move(state, ev(72, 72), cb.render); // -24, -24 (already grid aligned)
        expect(m.x).toBe(72);
        expect(m.y).toBe(72);
        expect(m.width).toBe(216);
        expect(m.height).toBe(168);

        handleMouseUp(state, cb);
        expect(state.mode.kind).toBe('idle');
        expect(calls.saveToStorage).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Connection creation
// ---------------------------------------------------------------------------

describe('connection creation lifecycle', () => {
    test('drag from one border to another creates a connection', () => {
        const state = makeState();
        const a = moduleAt(96, 96);   // right border midpoint (288, 168)
        const b = moduleAt(480, 96);  // left border midpoint (480, 168)
        state.elements.push(a, b);
        const { calls, cb } = makeSpies();

        // Hovering A's right border (normally set by idle mousemove)
        state.hoverConnectionPoint = borderPoint(a, 'right', 288, 168);

        handleMouseDown(state, ev(288, 168), cb);
        expect(state.mode.kind).toBe('connecting');
        if (state.mode.kind === 'connecting') {
            expect(state.mode.source.componentId).toBe(a.id);
            expect(state.mode.source.side).toBe('right');
        }

        // Drag over to B's left border
        state.lastScreenMousePos = { x: 480, y: 168 };
        state.hoverConnectionPoint = borderPoint(b, 'left', 480, 168);

        handleMouseUp(state, cb);

        expect(state.mode.kind).toBe('idle');
        expect(state.connections.length).toBe(1);
        const conn = state.connections[0]!;
        expect(conn.sourcePoint.componentId).toBe(a.id);
        expect(conn.targetPoint.componentId).toBe(b.id);
        expect(state.hoverConnectionPoint).toBeNull();
        expect(calls.saveToStorage).toBe(1);
    });

    test('a click without dragging selects the source element instead', () => {
        const state = makeState();
        const a = moduleAt(96, 96);
        state.elements.push(a);
        const { calls, cb } = makeSpies();

        state.hoverConnectionPoint = borderPoint(a, 'right', 288, 168);
        handleMouseDown(state, ev(288, 168), cb);
        expect(state.mode.kind).toBe('connecting');

        // Release almost in place (< 10px drag distance)
        state.lastScreenMousePos = { x: 290, y: 169 };
        handleMouseUp(state, cb);

        expect(state.mode.kind).toBe('idle');
        expect(state.connections.length).toBe(0);
        expect(state.selectedElements).toEqual([a]);
        expect(calls.saveToStorage).toBe(0); // nothing changed
    });
});

// ---------------------------------------------------------------------------
// Idle no-ops
// ---------------------------------------------------------------------------

describe('idle mouseup', () => {
    test('does nothing and persists nothing', () => {
        const state = makeState();
        const { calls, cb } = makeSpies();

        handleMouseUp(state, cb);

        expect(state.mode.kind).toBe('idle');
        expect(calls.saveState).toBe(0);
        expect(calls.saveToStorage).toBe(0);
    });
});
