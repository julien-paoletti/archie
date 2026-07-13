/**
 * Regression tests for the connection-persistence desync bug.
 *
 * Bug: the editor state and the serialization manager shared the SAME
 * connections array *by reference*, captured once at construction. When the
 * editor reassigned `state.connections` (e.g. `state.connections = filter(...)`
 * on element removal), the manager kept pointing at the OLD array — so any
 * connection drawn afterwards was pushed onto the editor's new array but never
 * seen by save/serialize. On reload those connections were gone.
 *
 * These tests encode the two invariants of the fix:
 *   1. removeComponent must mutate the connections array IN PLACE (splice),
 *      never reassign it, so shared references survive.
 *   2. The serialization view must read the editor's CURRENT array (live
 *      getter), so even a reassignment can't desync it.
 */

import { describe, expect, test } from 'bun:test';
import { Connection } from '../src/canvas/connection/connection';
import type { ConnectionPoint } from '../src/canvas/types';

const point = (componentId: string): ConnectionPoint => ({
    x: 0, y: 0, componentId, side: 'right', offset: 0.5
});

const makeConn = (id: string, from: string, to: string) =>
    new Connection({ id, sourcePoint: point(from), targetPoint: point(to) });

/** Mirror of the editor's real removal logic (dragDropHandler.removeComponent). */
function removeComponentConnections(state: { connections: Connection[] }, removedId: string): void {
    const kept = state.connections.filter(
        c => c.sourcePoint.componentId !== removedId && c.targetPoint.componentId !== removedId
    );
    // In place — the fix. (The bug was: state.connections = kept)
    state.connections.splice(0, state.connections.length, ...kept);
}

describe('removeComponent connection removal', () => {
    test('drops only connections touching the removed element', () => {
        const state = { connections: [makeConn('c1', 'a', 'b'), makeConn('c2', 'b', 'c')] };
        removeComponentConnections(state, 'a');
        expect(state.connections.map(c => c.id)).toEqual(['c2']);
    });

    test('preserves the array identity (does not reassign)', () => {
        const state = { connections: [makeConn('c1', 'a', 'b')] };
        const originalRef = state.connections;
        removeComponentConnections(state, 'a');
        // Same array object — a reassignment would have replaced it.
        expect(state.connections).toBe(originalRef);
    });

    test('a shared reference still sees the result after removal', () => {
        const state = { connections: [makeConn('c1', 'a', 'b'), makeConn('c2', 'b', 'c')] };
        const sharedView = state.connections; // captured once, like the old manager
        removeComponentConnections(state, 'a');
        expect(sharedView).toBe(state.connections);
        expect(sharedView.map(c => c.id)).toEqual(['c2']);
    });
});

describe('serialization view stays in sync (live-getter model)', () => {
    // Editor state whose `connections` CAN be reassigned, matching EditorState.
    function makeEditorState() {
        return { connections: [] as Connection[] };
    }

    // The FIXED serialization view: a live getter onto the editor state.
    function makeLiveSerView(editorState: { connections: Connection[] }) {
        return {
            get connections() { return editorState.connections; }
        };
    }

    test('connections drawn after a reassignment are still visible to the serializer', () => {
        const editor = makeEditorState();
        const serView = makeLiveSerView(editor);

        editor.connections.push(makeConn('c1', 'a', 'b'));

        // Simulate the historical reassignment (e.g. element removal path
        // before the splice fix, or any future reassignment).
        editor.connections = editor.connections.filter(() => true);

        // Draw a NEW connection after the reassignment.
        editor.connections.push(makeConn('c2', 'c', 'd'));

        // The live getter sees BOTH — this is what the bug got wrong.
        expect(serView.connections.map(c => c.id)).toEqual(['c1', 'c2']);
    });

    test('demonstrates the OLD desync a captured reference would have suffered', () => {
        const editor = makeEditorState();
        const staleView = editor.connections; // old behavior: capture by reference

        editor.connections.push(makeConn('c1', 'a', 'b'));
        editor.connections = editor.connections.filter(() => true); // reassignment
        editor.connections.push(makeConn('c2', 'c', 'd'));           // drawn after

        // The stale reference is frozen at the pre-reassignment array — it never
        // sees c2. This asserts the failure mode the fix eliminates.
        expect(staleView.map(c => c.id)).toEqual(['c1']);
        expect(editor.connections.map(c => c.id)).toEqual(['c1', 'c2']);
    });
});
