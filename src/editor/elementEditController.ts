/**
 * Element Edit Controller
 * Inline editing for connection labels, descriptions, notes, labels,
 * numbered dots, tags, and port numbers.
 *
 * All seven edit types share one lifecycle — start (hide canvas text, mount a
 * positioned field), finish (commit if changed), cancel, cleanup — so the
 * lifecycle lives in ONE generic engine and each type only supplies a small
 * config: how to create/style its field, how to position it, and how to
 * commit its value. Exactly one edit session is active at a time.
 */

import { Component, Connection, Label, Module, Note, NumberedDot, Port, Tag } from '../canvas/index';
import type { EditCallbacks } from './editUtils';
import { createInput, attachInputListeners, mountAndFocus } from './editUtils';

export interface ElementEditExtraCallbacks extends EditCallbacks {
    getMidpoint: (connection: Connection) => { x: number; y: number } | null;
}

// ============================================================================
// Generic edit-session engine
// ============================================================================

type EditField = HTMLInputElement | HTMLTextAreaElement;

type EditKind = 'connectionLabel' | 'description' | 'note' | 'label' | 'dot' | 'tag' | 'port';

interface EditConfig<T, F extends EditField> {
    /** Hide/restore the on-canvas text while the field is open. */
    setHidden?: (target: T, hidden: boolean) => void;
    /** Build and style the field (position is applied separately). Null aborts the edit. */
    create: (target: T, cb: ElementEditExtraCallbacks) => F | null;
    /** Apply position (and position-dependent size) — also used for live reposition on pan/zoom. */
    position: (target: T, field: F, cb: ElementEditExtraCallbacks) => void;
    /** Commit the edited value; owns its change-detection and saveState/saveToStorage semantics. */
    commit: (target: T, field: F, cb: EditCallbacks) => void;
    /** Textarea semantics: blur/Escape only (Enter inserts a newline), caret placed at the end. */
    multiline?: boolean;
    /** Focus delay in ms for fields that need the render to settle first. */
    focusDelay?: number;
}

interface ActiveEdit<T = unknown, F extends EditField = EditField> {
    kind: EditKind;
    target: T;
    field: F;
    config: EditConfig<T, F>;
}

export interface ElementEditState {
    session: ActiveEdit | null;
}

export function createElementEditState(): ElementEditState {
    return { session: null };
}

export function isElementEditing(state: ElementEditState): boolean {
    return state.session !== null;
}

function beginEdit<T, F extends EditField>(
    state: ElementEditState,
    kind: EditKind,
    target: T,
    config: EditConfig<T, F>,
    cb: ElementEditExtraCallbacks
): void {
    // Single active session: starting any edit finishes the previous one.
    finishActiveEdit(state, cb);

    config.setHidden?.(target, true);
    cb.render();

    const field = config.create(target, cb);
    if (!field) {
        // Aborted (e.g. connection midpoint unavailable) — restore and bail.
        config.setHidden?.(target, false);
        cb.render();
        return;
    }
    config.position(target, field, cb);

    const finish = () => finishActiveEdit(state, cb);
    const cancel = () => cancelActiveEdit(state, cb);

    if (config.multiline) {
        field.addEventListener('blur', finish);
        // Generic F widens addEventListener to the base Event signature.
        field.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Escape') cancel();
        });
    } else {
        attachInputListeners(field as HTMLInputElement, finish, cancel);
    }

    // The session erases T/F to the union types; config and target/field are
    // always a matched pair by construction, so the erasure is safe.
    state.session = { kind, target, field, config } as unknown as ActiveEdit;

    if (config.multiline) {
        document.body.appendChild(field);
        setTimeout(() => {
            field.focus();
            field.setSelectionRange(field.value.length, field.value.length);
        }, config.focusDelay ?? 10);
    } else {
        mountAndFocus(field, config.focusDelay ?? 0);
    }
}

export function finishActiveEdit(state: ElementEditState, cb: EditCallbacks): void {
    const s = state.session;
    if (!s) return;
    s.config.commit(s.target, s.field, cb);
    cleanupSession(state);
    cb.render();
}

export function cancelActiveEdit(state: ElementEditState, cb: EditCallbacks): void {
    if (!state.session) return;
    cleanupSession(state);
    cb.render();
}

function cleanupSession(state: ElementEditState): void {
    const s = state.session;
    if (!s) return;
    state.session = null; // clear first so a blur fired by remove() is a no-op
    if (s.field.parentElement) s.field.remove();
    s.config.setHidden?.(s.target, false);
}

export function updateElementEditPositions(state: ElementEditState, cb: ElementEditExtraCallbacks): void {
    const s = state.session;
    if (!s) return;
    s.config.position(s.target, s.field, cb);
}

// ============================================================================
// Per-type configs
// ============================================================================

const connectionLabelConfig: EditConfig<Connection, HTMLInputElement> = {
    setHidden: (conn, hidden) => { conn.hideLabel = hidden; },
    create: (conn, cb) => {
        if (!cb.getMidpoint(conn)) return null;
        const scale = cb.getScale();
        const input = createInput('text', 'connection-label-input');
        input.value = conn.label;
        input.placeholder = 'Enter label...';
        input.style.width = `${120 * scale}px`;
        input.style.height = `${28 * scale}px`;
        input.style.textAlign = 'center';
        input.style.fontSize = `${Math.max(10, Math.round(12 * scale))}px`;
        input.style.fontFamily = '"Segoe UI", sans-serif';
        input.style.color = '#374151';
        input.style.border = '1px solid #f97316';
        input.style.borderRadius = '4px';
        input.style.padding = `0 ${8 * scale}px`;
        input.style.background = '#ffffff';
        return input;
    },
    position: (conn, input, cb) => {
        const midpoint = cb.getMidpoint(conn);
        if (!midpoint) return;
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(midpoint.x, midpoint.y);
        const inputWidth = 120 * scale;
        input.style.left = `${canvasRect.left + screenPos.x - inputWidth / 2}px`;
        input.style.top = `${canvasRect.top + screenPos.y - 14 * scale}px`;
    },
    commit: (conn, input, cb) => {
        const newLabel = input.value.trim();
        if (newLabel !== conn.label) cb.saveState();
        conn.label = newLabel;
        cb.saveToStorage();
    }
};

/** World-Y offset of the description centerline from the element's top. */
function descriptionOffsetY(component: Component | Module): number {
    return component instanceof Module
        ? component.descriptionY - component.y
        : component.height / 2 + 12;
}

const descriptionConfig: EditConfig<Component | Module, HTMLInputElement> = {
    setHidden: (comp, hidden) => { comp.hideDescription = hidden; },
    create: (comp, cb) => {
        const scale = cb.getScale();
        const input = createInput('text', 'description-edit-input');
        input.value = comp.description || '';
        input.placeholder = 'Enter description...';
        input.style.height = `${24 * scale}px`;
        input.style.textAlign = 'center';
        input.style.fontSize = `${Math.max(10, Math.round(11 * scale))}px`;
        input.style.fontFamily = '"Segoe UI", sans-serif';
        input.style.color = '#6B7280';
        input.style.fontWeight = '400';
        input.style.padding = `0 ${8 * scale}px`;
        input.style.background = 'transparent';
        return input;
    },
    position: (comp, input, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(comp.x, comp.y);
        input.style.left = `${canvasRect.left + screenPos.x}px`;
        input.style.top = `${canvasRect.top + screenPos.y + (descriptionOffsetY(comp) - 6) * scale}px`;
        input.style.width = `${comp.width * scale}px`;
    },
    commit: (comp, input, cb) => {
        const newDescription = input.value.trim();
        if (newDescription !== comp.description) cb.saveState();
        comp.description = newDescription;
        cb.saveToStorage();
    },
    focusDelay: 10
};

const noteConfig: EditConfig<Note, HTMLTextAreaElement> = {
    setHidden: (note, hidden) => { note.hideText = hidden; },
    create: (note, cb) => {
        const scale = cb.getScale();
        const textarea = document.createElement('textarea');
        textarea.value = note.text;
        textarea.className = 'text-element-edit';
        textarea.style.position = 'absolute';
        textarea.style.fontSize = `${Math.max(10, Math.round(note.fontSize * scale))}px`;
        textarea.style.fontFamily = note.fontFamily;
        textarea.style.color = note.textColor;
        textarea.style.background = note.backgroundColor;
        textarea.style.padding = `${note.padding * scale}px`;
        textarea.style.lineHeight = `${note.lineHeight}`;
        textarea.style.border = '2px solid #3B82F6';
        textarea.style.borderRadius = '0';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.boxSizing = 'border-box';
        textarea.style.zIndex = '1000';
        textarea.style.overflow = 'hidden';
        return textarea;
    },
    position: (note, textarea, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(note.x, note.y);
        textarea.style.left = `${canvasRect.left + screenPos.x}px`;
        textarea.style.top = `${canvasRect.top + screenPos.y}px`;
        textarea.style.width = `${note.width * scale}px`;
        textarea.style.height = `${note.height * scale}px`;
    },
    commit: (note, textarea, cb) => {
        const newText = textarea.value;
        if (newText !== note.text) {
            cb.saveState();
            note.text = newText;
            cb.saveToStorage();
        }
    },
    multiline: true
};

const labelConfig: EditConfig<Label, HTMLInputElement> = {
    setHidden: (label, hidden) => { label.hideText = hidden; },
    create: (label, cb) => {
        const scale = cb.getScale();
        const input = createInput('text', 'title-edit-input');
        input.value = label.text;
        input.style.textAlign = 'left';
        input.style.color = label.textColor;
        input.style.fontWeight = label.fontWeight;
        input.style.fontSize = `${Math.max(10, Math.round(label.fontSize * scale))}px`;
        input.style.fontFamily = label.fontFamily;
        input.style.padding = `0 ${4 * scale}px`;
        input.style.background = '#ffffff';
        input.style.border = '1px solid #3B82F6';
        input.style.borderRadius = '2px';
        return input;
    },
    position: (label, input, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(label.x, label.y);
        input.style.left = `${canvasRect.left + screenPos.x}px`;
        input.style.top = `${canvasRect.top + screenPos.y}px`;
        input.style.width = `${label.width * scale}px`;
        input.style.height = `${label.height * scale}px`;
    },
    commit: (label, input, cb) => {
        const newText = input.value.trim();
        if (newText && newText !== label.text) {
            cb.saveState();
            label.text = newText;
            cb.saveToStorage();
        }
    }
};

const dotConfig: EditConfig<NumberedDot, HTMLInputElement> = {
    create: (dot, cb) => {
        const scale = cb.getScale();
        const input = createInput('number', 'title-edit-input');
        input.value = dot.number.toString();
        input.min = '0';
        input.style.width = `${50 * scale}px`;
        input.style.height = `${28 * scale}px`;
        input.style.textAlign = 'center';
        input.style.color = dot.dotColor;
        input.style.fontWeight = '700';
        input.style.fontSize = `${Math.max(10, Math.round(14 * scale))}px`;
        input.style.padding = `0 ${4 * scale}px`;
        input.style.background = '#ffffff';
        input.style.border = '2px solid ' + dot.dotColor;
        input.style.borderRadius = '4px';
        return input;
    },
    position: (dot, input, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(dot.x, dot.y);
        const scaledSize = dot.dotSize * scale;
        const inputWidth = 50 * scale;
        input.style.left = `${canvasRect.left + screenPos.x + scaledSize / 2 - inputWidth / 2}px`;
        input.style.top = `${canvasRect.top + screenPos.y + scaledSize + 4 * scale}px`;
    },
    commit: (dot, input, cb) => {
        const newNumber = parseInt(input.value);
        if (!isNaN(newNumber) && newNumber !== dot.number) {
            cb.saveState();
            dot.number = newNumber;
            cb.saveToStorage();
        }
    }
};

const tagConfig: EditConfig<Tag, HTMLInputElement> = {
    setHidden: (tag, hidden) => { tag.hideTitle = hidden; },
    create: (tag, cb) => {
        const scale = cb.getScale();
        const input = createInput('text', 'title-edit-input');
        input.value = tag.text;
        input.style.textAlign = 'center';
        input.style.color = tag.textColor;
        input.style.fontWeight = '600';
        input.style.fontSize = `${Math.max(8, Math.round(tag.fontSize * scale))}px`;
        input.style.fontFamily = '"Segoe UI", sans-serif';
        input.style.padding = '0 4px';
        input.style.background = tag.backgroundColor;
        input.style.border = '2px solid #3B82F6';
        input.style.borderRadius = `${tag.height * scale / 2}px`;
        return input;
    },
    position: (tag, input, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(tag.x, tag.y);
        input.style.left = `${canvasRect.left + screenPos.x}px`;
        input.style.top = `${canvasRect.top + screenPos.y}px`;
        input.style.width = `${tag.width * scale}px`;
        input.style.height = `${tag.height * scale}px`;
    },
    commit: (tag, input, cb) => {
        const newText = input.value.trim();
        if (newText && newText !== tag.text) {
            cb.saveState();
            tag.text = newText;
            tag.title = newText;
            const charWidth = tag.fontSize * 0.62;
            tag.width = Math.max(40, newText.length * charWidth + 20);
            cb.saveToStorage();
        }
    }
};

const portConfig: EditConfig<Port, HTMLInputElement> = {
    create: (port, cb) => {
        const scale = cb.getScale();
        const input = createInput('number', 'title-edit-input');
        input.value = port.portNumber !== null ? port.portNumber.toString() : '';
        input.placeholder = '#';
        input.min = '0';
        input.style.width = `${50 * scale}px`;
        input.style.height = `${28 * scale}px`;
        input.style.textAlign = 'center';
        input.style.color = port.portColor;
        input.style.fontWeight = '700';
        input.style.fontSize = `${Math.max(10, Math.round(14 * scale))}px`;
        input.style.padding = `0 ${4 * scale}px`;
        input.style.background = '#ffffff';
        input.style.border = `2px solid ${port.portColor}`;
        input.style.borderRadius = '4px';
        return input;
    },
    position: (port, input, cb) => {
        const scale = cb.getScale();
        const canvasRect = cb.getCanvasRect();
        const screenPos = cb.worldToScreen(port.x, port.y);
        const size = 28 * scale;
        const inputWidth = 50 * scale;
        input.style.left = `${canvasRect.left + screenPos.x + size / 2 - inputWidth / 2}px`;
        input.style.top = `${canvasRect.top + screenPos.y + size + 4 * scale}px`;
    },
    commit: (port, input, cb) => {
        const raw = input.value.trim();
        const newNumber = raw === '' ? null : parseInt(raw);
        const parsed = newNumber === null || !isNaN(newNumber) ? newNumber : port.portNumber;
        if (parsed !== port.portNumber) {
            cb.saveState();
            port.portNumber = parsed;
            cb.saveToStorage();
        }
    }
};

// ============================================================================
// Public start functions (one per edit type)
// ============================================================================

export function startConnectionLabelEdit(state: ElementEditState, connection: Connection, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'connectionLabel', connection, connectionLabelConfig, cb);
}

export function startDescriptionEdit(state: ElementEditState, component: Component | Module, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'description', component, descriptionConfig, cb);
}

export function startNoteEdit(state: ElementEditState, note: Note, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'note', note, noteConfig, cb);
}

export function startLabelEdit(state: ElementEditState, label: Label, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'label', label, labelConfig, cb);
}

export function startNumberEdit(state: ElementEditState, dot: NumberedDot, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'dot', dot, dotConfig, cb);
}

export function startTagEdit(state: ElementEditState, tag: Tag, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'tag', tag, tagConfig, cb);
}

export function startPortNumberEdit(state: ElementEditState, port: Port, cb: ElementEditExtraCallbacks): void {
    beginEdit(state, 'port', port, portConfig, cb);
}
