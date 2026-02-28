/**
 * Drag & Drop Handler
 * Manages palette drag-over/drop, element creation, and removal
 */

import {
    Domain,
    Module,
    NumberedDot,
    Tag,
    elementRegistry,
    type DiagramElement
} from '../canvas/index';
import type { EditorState } from './editorState';
import type { DragData } from './editorTypes';
import { getMousePosition } from './viewportHandler';
import { selectElement } from './selectionHandler';
import { updateWorldSize } from './viewportHandler';

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

        if (component instanceof Module || component instanceof Domain) {
            for (const child of component.children) {
                child.parentId = null;
            }
        }

        if (component.parentId) {
            const parent = state.elements.find(c => c.id === component.parentId) as Module | Domain | undefined;
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
