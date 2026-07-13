/**
 * Nudge Handler
 * Keyboard-driven movement of the current selection (arrow keys).
 */

import { ContainerElement, type DiagramElement } from '../canvas/index';
import type { EditorState } from './editorState';
import { shiftConnectionGeometryForSelection } from './selectionHandler';
import { updateSnappedPorts } from './dragDropHandler';
import { checkAndExtendWorld } from './viewportHandler';

/**
 * Move all selected elements by (dx, dy), keeping attached connection
 * geometry and snapped ports in sync, and growing parent containers.
 * Returns false when nothing is selected.
 */
export function nudgeSelectedElements(state: EditorState, dx: number, dy: number): boolean {
    if (state.selectedElements.length === 0) return false;

    const selectedIds = new Set(state.selectedElements.map(el => el.id));

    // Move top-level selected elements; children of selected containers follow
    // their parent via ContainerElement.moveBy.
    for (const comp of state.selectedElements) {
        const parentIsSelected = comp.parentId && selectedIds.has(comp.parentId);
        if (!parentIsSelected) {
            comp.moveBy(dx, dy);
        }
    }

    shiftConnectionGeometryForSelection(state, dx, dy);

    // Reposition ports snapped to any moving element (including descendants of moving containers)
    const movingIds = new Set(selectedIds);
    const collectDescendants = (el: DiagramElement) => {
        if (el instanceof ContainerElement) {
            for (const child of el.children) {
                movingIds.add(child.id);
                collectDescendants(child);
            }
        }
    };
    for (const el of state.selectedElements) collectDescendants(el);
    updateSnappedPorts(state.elements, movingIds);

    // Grow unselected parent containers whose children were nudged
    const parentIds = new Set<string>();
    for (const comp of state.selectedElements) {
        if (comp.parentId && !selectedIds.has(comp.parentId)) parentIds.add(comp.parentId);
    }
    for (const pid of parentIds) {
        const parent = state.elements.find(el => el.id === pid);
        if (parent instanceof ContainerElement) parent.recalculateBounds();
    }

    // Extend the world if the selection was pushed past an edge
    for (const comp of state.selectedElements) {
        checkAndExtendWorld(state, comp.x + comp.width, comp.y + comp.height);
    }

    return true;
}
