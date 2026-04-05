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
    Port,
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

// ============================================================================
// Deserialization safety
// ============================================================================

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Recursively strip prototype-polluting keys from an object. */
function sanitize<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize) as T;
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (!DANGEROUS_KEYS.has(key)) {
            clean[key] = sanitize((obj as Record<string, unknown>)[key]);
        }
    }
    return clean as T;
}

/** Validate the basic shape of a deserialized diagram. Returns null if invalid. */
function validateDiagram(data: unknown): SerializedDiagram | SerializedComponent[] | null {
    if (data === null || typeof data !== 'object') return null;

    if (Array.isArray(data)) {
        // Legacy format: array of components
        for (const item of data) {
            if (!isValidComponent(item)) return null;
        }
        return sanitize(data as SerializedComponent[]);
    }

    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.components)) return null;
    for (const item of d.components) {
        if (!isValidComponent(item)) return null;
    }
    if (d.connections !== undefined && !Array.isArray(d.connections)) return null;
    return sanitize(data as SerializedDiagram);
}

function isValidComponent(item: unknown): boolean {
    if (item === null || typeof item !== 'object') return false;
    const c = item as Record<string, unknown>;
    return typeof c.type === 'string' && typeof c.id === 'string' &&
        typeof c.x === 'number' && typeof c.y === 'number';
}

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
                    if (c.noteIcon !== 'info-circle') base.noteIcon = c.noteIcon;
                    if (c.noteIconPosition !== 'top-left') base.noteIconPosition = c.noteIconPosition;
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
                if (c instanceof Port) {
                    if (c.portNumber !== null) base.portNumber = c.portNumber;
                    if (c.portColor !== '#475569') base.portColor = c.portColor;
                    if (c.snappedToId) {
                        base.snappedToId = c.snappedToId;
                        base.snappedSide = c.snappedSide;
                        base.snappedOffset = c.snappedOffset;
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

    fromJSON(rawData: unknown): void {
        const data = validateDiagram(rawData);
        if (!data) {
            console.warn('Invalid diagram data — skipping load');
            return;
        }

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
                const raw = JSON.parse(stored);
                const data = validateDiagram(raw);
                if (!data) {
                    console.warn('Invalid diagram in localStorage — skipping');
                    return;
                }
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
                        for (const connData of data.connections) {
                            if (componentIds.has(connData.sourcePoint.componentId) &&
                                componentIds.has(connData.targetPoint.componentId)) {
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
