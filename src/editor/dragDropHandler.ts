/**
 * Drag & Drop Handler
 * Manages palette drag-over/drop, element creation, and removal
 */

import {
    Domain,
    Module,
    System,
    NumberedDot,
    Tag,
    GRID_SIZE,
    elementRegistry,
    type DiagramElement
} from '../canvas/index';
import type { EditorState } from './editorState';
import type { DragData } from './editorTypes';
import { getMousePosition } from './viewportHandler';
import { selectElement } from './selectionHandler';
import { updateWorldSize } from './viewportHandler';

/**
 * Core overlap resolution. Ejects `element` in the direction it is most
 * displaced from the blocking sibling (right / left / down / up), then
 * iterates until free or the search limit is reached.
 * Call recalculateBounds() on containers afterwards.
 */
function resolveOverlap(element: DiagramElement, siblings: DiagramElement[]): void {
    if (siblings.length === 0) return;

    const overlappingWith = (ax: number, ay: number): DiagramElement | null => {
        for (const s of siblings) {
            if (
                ax < s.x + s.width &&
                ax + element.width > s.x &&
                ay < s.y + s.height &&
                ay + element.height > s.y
            ) return s;
        }
        return null;
    };

    let blocker = overlappingWith(element.x, element.y);
    if (!blocker) return;

    const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
    const gap = GRID_SIZE;

    for (let iter = 0; iter < 40 && blocker !== null; iter++) {
        const elCx = element.x + element.width / 2;
        const elCy = element.y + element.height / 2;
        const blCx = blocker.x + blocker.width / 2;
        const blCy = blocker.y + blocker.height / 2;

        const dx = elCx - blCx;
        const dy = elCy - blCy;

        let newX = element.x;
        let newY = element.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
            // Horizontal eject
            if (dx >= 0) {
                newX = snap(blocker.x + blocker.width + gap);
            } else {
                newX = snap(blocker.x - element.width - gap);
            }
        } else {
            // Vertical eject
            if (dy >= 0) {
                newY = snap(blocker.y + blocker.height + gap);
            } else {
                newY = snap(blocker.y - element.height - gap);
            }
        }

        element.moveTo(newX, newY);

        blocker = overlappingWith(element.x, element.y);
    }
}

/** Resolve overlaps against siblings within a container. */
export function resolveOverlapInContainer(element: DiagramElement, container: Module | Domain | System): void {
    resolveOverlap(element, container.children.filter(c => c !== element));
}

/**
 * Resolve overlaps against all elements at the same level (same parentId).
 * Works for canvas-level (parentId = null) and container-level drops.
 */
export function resolveOverlapAtLevel(element: DiagramElement, allElements: DiagramElement[]): void {
    resolveOverlap(element, allElements.filter(c => c !== element && c.parentId === element.parentId));
}

export function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
    }
}

export function handleDragLeave(): void {
    // Handle drag leave if needed
}

export function handleDrop(
    state: EditorState,
    e: DragEvent,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    e.preventDefault();
    if (!e.dataTransfer) return;

    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragData;
        if (data.action === 'create' && data.type) {
            const pos = getMousePosition(state, e);
            createElement(state, data.type, pos.x, pos.y, saveState, saveToStorage, render);
        }
    } catch (_err) {
        // Invalid drag data
    }
}

export function createElement(
    state: EditorState,
    type: string,
    x: number,
    y: number,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): DiagramElement | null {
    const ComponentClass = elementRegistry.get(type);
    if (!ComponentClass) return null;

    const component = ComponentClass.createDefault();

    if (component instanceof NumberedDot) {
        component.number = state.nextDotNumber;
        state.nextDotNumber++;
    }

    let posX = x - component.width / 2;
    let posY = y - component.height / 2;

    if (state.snapToGrid && !(component instanceof NumberedDot) && !(component instanceof Tag)) {
        posX = Math.round(posX / state.gridSize) * state.gridSize;
        posY = Math.round(posY / state.gridSize) * state.gridSize;
    }

    component.moveTo(posX, posY);
    addElement(state, component, saveState, saveToStorage, render);
    selectElement(state, component);

    // If dropped inside a container, auto-adopt it (respecting nesting rules)
    const cx = posX + component.width / 2;
    const cy = posY + component.height / 2;
    // Prefer innermost (smallest) matching container
    const container = state.elements
        .filter(el => {
            if (!(el instanceof Module || el instanceof Domain || el instanceof System)) return false;
            if (!el.containsPoint(cx, cy)) return false;
            if (component instanceof System) return false;                          // System never adopted
            if (el instanceof System && !(component instanceof Domain)) return false; // Only Domain→System
            if (el instanceof Module && (component instanceof Module || component instanceof Domain)) return false;
            return true;
        })
        .sort((a, b) => (a.width * a.height) - (b.width * b.height))[0] as Module | Domain | System | undefined;
    if (container) {
        container.addChild(component);
    }

    // Resolve overlaps against all elements at the same level (container or canvas)
    resolveOverlapAtLevel(component, state.elements);

    if (container) {
        container.recalculateBounds();
        render();
    }

    return component;
}

export function addElement(
    state: EditorState,
    component: DiagramElement,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    saveState();
    state.elements.push(component);
    updateWorldSize(state);
    render();
    saveToStorage();
}

export function removeComponent(
    state: EditorState,
    component: DiagramElement,
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): void {
    const index = state.elements.indexOf(component);
    if (index > -1) {
        saveState();

        if (component instanceof Module || component instanceof Domain || component instanceof System) {
            for (const child of component.children) {
                child.parentId = null;
            }
        }

        if (component.parentId) {
            const parent = state.elements.find(c => c.id === component.parentId) as Module | Domain | System | undefined;
            if (parent) {
                parent.removeChild(component);
            }
        }

        state.elements.splice(index, 1);
        const selIndex = state.selectedElements.indexOf(component);
        if (selIndex > -1) {
            state.selectedElements.splice(selIndex, 1);
        }
        state.connections = state.connections.filter(
            conn => conn.sourcePoint.componentId !== component.id &&
                conn.targetPoint.componentId !== component.id
        );
        render();
        saveToStorage();
    }
}
