/**
 * Keyboard Handler
 * Manages keyboard events for pan mode (space key)
 */

import type { EditorState } from './editorState';

export function handleKeyDown(state: EditorState, e: KeyboardEvent): void {
    if (e.code === 'Space' && !state.isSpacePressed) {
        const activeElement = document.activeElement;
        if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
            return;
        }
        e.preventDefault();
        state.isSpacePressed = true;
        state.canvas.style.cursor = 'grab';
    }
}

export function handleKeyUp(state: EditorState, e: KeyboardEvent): void {
    if (e.code === 'Space') {
        state.isSpacePressed = false;
        if (!state.isPanning) {
            state.canvas.style.cursor = 'default';
        }
    }
}
