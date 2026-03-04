/**
 * Serialization Manager
 * Handles save/load, undo/redo, and clipboard operations
 */

import {
    Boundary,
    Component,
    Connection,
    Module,
    Domain,
    System,
    Note,
    NumberedDot,
    Label,
    Tag,
    User,
    elementRegistry,
    type DiagramElement
} from '../canvas/index';
import type { SerializedComponent, SerializedConnection, SerializedDiagram } from './editorTypes';

export interface SerializationState {
    elements: DiagramElement[];
    connections: Connection[];
    historyStack: SerializedDiagram[];
    redoStack: SerializedDiagram[];
    clipboard: SerializedComponent[];
    nextDotNumber: number;
    panOffset: { x: number; y: number };
}

export interface SerializationCallbacks {
    clearAll: () => void;
    render: () => void;
    updateWorldSize: () => void;
    getScale: () => number;
    setScale: (scale: number) => void;
}

export class SerializationManager {
    private readonly storageKey: string = 'archie-diagram';
    private readonly MAX_HISTORY_SIZE = 50;
    private autoSaveEnabled: boolean = true;
    private isRestoringState: boolean = false;

    private state: SerializationState;
    private callbacks: SerializationCallbacks;

    constructor(state: SerializationState, callbacks: SerializationCallbacks) {
        this.state = state;
        this.callbacks = callbacks;
    }

    // Serialization
    toJSON(): SerializedDiagram {
        return {
            viewport: {
                scale: this.callbacks.getScale(),
                panX: this.state.panOffset.x,
                panY: this.state.panOffset.y
            },
            components: this.state.elements.map(c => {
                const base: SerializedComponent = {
                    type: (c.constructor as { type?: string }).type ?? 'unknown',
                    id: c.id,
                    x: c.x,
                    y: c.y,
                    width: c.width,
                    height: c.height,
                    title: c.title,
                    parentId: c.parentId
                };
                if (c instanceof Component) {
                    if (c.icon) {
                        base.icon = c.icon;
                        base.iconColor = c.iconColor;
                    }
                    if (c.description) {
                        base.description = c.description;
                    }
                }
                if (c instanceof Note || c instanceof Label) {
                    base.text = c.text;
                    if (c.fontSize !== 14) {
                        base.fontSize = c.fontSize;
                    }
                }
                if (c instanceof Note) {
                    if (c.backgroundColor !== '#FEF9E7') base.backgroundColor = c.backgroundColor;
                    if (c.textColor !== '#5D4E37') base.textColor = c.textColor;
                    if (c.accentColor !== '#F6E05E') base.accentColor = c.accentColor;
                    if (c.borderColor !== '#E8DFC0') base.noteBorderColor = c.borderColor;
                }
                if (c instanceof NumberedDot) {
                    base.number = c.number;
                }
                if (c instanceof Tag) {
                    base.text = c.text;
                    base.backgroundColor = c.backgroundColor;
                    base.textColor = c.textColor;
                    if (c.fontSize !== 11) {
                        base.fontSize = c.fontSize;
                    }
                }
                if (c instanceof Boundary && c.labelPosition !== 'top-left') {
                    base.labelPosition = c.labelPosition;
                }
                if ((c instanceof Component || c instanceof User || c instanceof Module || c instanceof Domain || c instanceof System || c instanceof Boundary) && c.borderColor) {
                    base.borderColor = c.borderColor;
                }
                return base;
            }),
            connections: this.state.connections.map(c => c.toJSON())
        };
    }

    fromJSON(data: SerializedDiagram | SerializedComponent[]): void {
        // Clear arrays in-place (preserves shared references)
        this.state.elements.length = 0;
        this.state.connections.length = 0;

        if (Array.isArray(data)) {
            data.forEach(item => {
                const component = elementRegistry.createInstance(item.type, item);
                this.state.elements.push(component);
            });
        } else {
            data.components.forEach(item => {
                const component = elementRegistry.createInstance(item.type, item);
                this.state.elements.push(component);
            });
            if (data.connections) {
                data.connections.forEach(connData => {
                    const connection = new Connection(connData as any);
                    this.state.connections.push(connection);
                });
            }
        }

        for (const comp of this.state.elements) {
            if (comp instanceof Module || comp instanceof Domain || comp instanceof System) {
                comp.restoreChildren(this.state.elements);
            }
        }

        let maxDotNumber = 0;
        for (const comp of this.state.elements) {
            if (comp instanceof NumberedDot && comp.number > maxDotNumber) {
                maxDotNumber = comp.number;
            }
        }
        this.state.nextDotNumber = maxDotNumber + 1;

        // Restore viewport if present
        if (!Array.isArray(data) && data.viewport) {
            this.callbacks.setScale(data.viewport.scale);
            this.state.panOffset.x = data.viewport.panX;
            this.state.panOffset.y = data.viewport.panY;
        }

        this.saveToStorage();
        this.callbacks.render();
    }

    // Storage
    saveToStorage(): void {
        if (!this.autoSaveEnabled) return;
        try {
            const data = this.toJSON();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (err) {
            console.warn('Failed to save diagram to localStorage:', err);
        }
    }

    loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored) as SerializedDiagram | SerializedComponent[];
                this.autoSaveEnabled = false;

                if (Array.isArray(data)) {
                    if (data.length > 0) {
                        data.forEach(item => {
                            const component = elementRegistry.createInstance(item.type, item);
                            this.state.elements.push(component);
                        });
                        console.log(`Loaded ${data.length} component(s) from storage`);
                    }
                } else {
                    if (data.components && data.components.length > 0) {
                        data.components.forEach(item => {
                            const component = elementRegistry.createInstance(item.type, item);
                            this.state.elements.push(component);
                        });
                    }
                    if (data.connections && data.connections.length > 0) {
                        const componentIds = new Set(this.state.elements.map(c => c.id));
                        const seen = new Set<string>();
                        for (const connData of data.connections) {
                            if (!seen.has(connData.id) &&
                                componentIds.has(connData.sourcePoint.componentId) &&
                                componentIds.has(connData.targetPoint.componentId)) {
                                seen.add(connData.id);
                                this.state.connections.push(new Connection(connData as any));
                            }
                        }
                    }
                    console.log(`Loaded ${data.components?.length ?? 0} component(s) and ${this.state.connections.length} connection(s) from storage`);
                }

                // Restore parent-child relationships
                for (const comp of this.state.elements) {
                    if (comp instanceof Module || comp instanceof Domain || comp instanceof System) {
                        comp.restoreChildren(this.state.elements);
                    }
                }

                // Restore viewport if present
                if (!Array.isArray(data) && data.viewport) {
                    this.callbacks.setScale(data.viewport.scale);
                    this.state.panOffset.x = data.viewport.panX;
                    this.state.panOffset.y = data.viewport.panY;
                }

                this.autoSaveEnabled = true;

                // Re-save to clean up any corrupted/duplicated data
                this.saveToStorage();
            }
        } catch (err) {
            console.warn('Failed to load diagram from localStorage:', err);
        }
    }

    clearStorage(): void {
        localStorage.removeItem(this.storageKey);
    }

    // Undo/Redo
    saveState(): void {
        if (this.isRestoringState) return;

        const currentState = this.toJSON();
        this.state.redoStack = [];
        this.state.historyStack.push(currentState);

        if (this.state.historyStack.length > this.MAX_HISTORY_SIZE) {
            this.state.historyStack.shift();
        }
    }

    undo(): boolean {
        if (this.state.historyStack.length === 0) return false;

        const currentState = this.toJSON();
        this.state.redoStack.push(currentState);

        const previousState = this.state.historyStack.pop()!;
        this.restoreState(previousState);

        return true;
    }

    redo(): boolean {
        if (this.state.redoStack.length === 0) return false;

        const currentState = this.toJSON();
        this.state.historyStack.push(currentState);

        const nextState = this.state.redoStack.pop()!;
        this.restoreState(nextState);

        return true;
    }

    private restoreState(state: SerializedDiagram): void {
        this.isRestoringState = true;

        this.state.elements.length = 0;
        this.state.connections.length = 0;

        state.components.forEach(item => {
            const component = elementRegistry.createInstance(item.type, item);
            this.state.elements.push(component);
        });

        if (state.connections) {
            state.connections.forEach(connData => {
                const connection = new Connection(connData);
                this.state.connections.push(connection);
            });
        }

        // Restore parent-child relationships
        for (const comp of this.state.elements) {
            if (comp instanceof Module || comp instanceof Domain || comp instanceof System) {
                comp.restoreChildren(this.state.elements);
            }
        }

        this.isRestoringState = false;
        this.callbacks.updateWorldSize();
        this.saveToStorage();
        this.callbacks.render();
    }

    canUndo(): boolean {
        return this.state.historyStack.length > 0;
    }

    canRedo(): boolean {
        return this.state.redoStack.length > 0;
    }

    // Clipboard
    copy(selectedElements: DiagramElement[]): boolean {
        if (selectedElements.length === 0) return false;

        this.state.clipboard = selectedElements.map(el => {
            const base: SerializedComponent = {
                type: (el.constructor as { type?: string }).type ?? 'unknown',
                id: el.id,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                title: el.title,
                parentId: el.parentId
            };
            if (el instanceof Component) {
                if (el.icon) {
                    base.icon = el.icon;
                    base.iconColor = el.iconColor;
                }
                if (el.description) {
                    base.description = el.description;
                }
            }
            return base;
        });

        return true;
    }

    paste(
        clearSelection: () => void,
        addElement: (el: DiagramElement) => void,
        selectElement: (el: DiagramElement) => void
    ): boolean {
        if (this.state.clipboard.length === 0) return false;

        this.saveState();
        clearSelection();

        const PASTE_OFFSET = 20;
        const idMapping = new Map<string, string>();

        for (const item of this.state.clipboard) {
            const newComponent = elementRegistry.createInstance(item.type, {
                ...item,
                x: item.x + PASTE_OFFSET,
                y: item.y + PASTE_OFFSET
            });
            idMapping.set(item.id, newComponent.id);
            addElement(newComponent);
            newComponent.selected = true;
            selectElement(newComponent);
        }

        // Update clipboard positions for next paste
        this.state.clipboard = this.state.clipboard.map(item => ({
            ...item,
            x: item.x + PASTE_OFFSET,
            y: item.y + PASTE_OFFSET
        }));

        this.saveToStorage();
        this.callbacks.render();
        return true;
    }

    canPaste(): boolean {
        return this.state.clipboard.length > 0;
    }
}
