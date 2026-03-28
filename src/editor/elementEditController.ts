/**
 * Element Edit Controller
 * Handles inline editing for Label, NumberedDot, Tag, Connection label, Description, and Note
 */

import { Component, Connection, Label, Note, NumberedDot, Port, Tag } from '../canvas/index';
import type { EditCallbacks } from './editUtils';
import { createInput, attachInputListeners, mountAndFocus } from './editUtils';

export interface ElementEditState {
    editingConnection: Connection | null;
    connectionLabelInput: HTMLInputElement | null;
    editingDescriptionComponent: Component | null;
    descriptionInput: HTMLInputElement | null;
    editingNote: Note | null;
    noteTextarea: HTMLTextAreaElement | null;
    editingLabel: Label | null;
    labelInput: HTMLInputElement | null;
    editingDot: NumberedDot | null;
    dotInput: HTMLInputElement | null;
    editingTag: Tag | null;
    tagInput: HTMLInputElement | null;
    editingPort: Port | null;
    portInput: HTMLInputElement | null;
}

export interface ElementEditExtraCallbacks extends EditCallbacks {
    getMidpoint: (connection: Connection) => { x: number; y: number } | null;
}

export function createElementEditState(): ElementEditState {
    return {
        editingConnection: null, connectionLabelInput: null,
        editingDescriptionComponent: null, descriptionInput: null,
        editingNote: null, noteTextarea: null,
        editingLabel: null, labelInput: null,
        editingDot: null, dotInput: null,
        editingTag: null, tagInput: null,
        editingPort: null, portInput: null
    };
}

// --- Connection Label ---
export function startConnectionLabelEdit(state: ElementEditState, connection: Connection, callbacks: ElementEditExtraCallbacks): void {
    if (state.editingConnection) finishConnectionLabelEdit(state, callbacks);

    state.editingConnection = connection;
    connection.hideLabel = true;
    callbacks.render();

    const midpoint = callbacks.getMidpoint(connection);
    if (!midpoint) return;

    const screenPos = callbacks.worldToScreen(midpoint.x, midpoint.y);
    const scale = callbacks.getScale();
    const canvasRect = callbacks.getCanvasRect();
    const inputWidth = 120 * scale;
    const scaledFontSize = Math.max(10, Math.round(12 * scale));

    const input = createInput('text', 'connection-label-input');
    input.value = connection.label;
    input.placeholder = 'Enter label...';
    input.style.left = `${canvasRect.left + screenPos.x - inputWidth / 2}px`;
    input.style.top = `${canvasRect.top + screenPos.y - 14 * scale}px`;
    input.style.width = `${inputWidth}px`;
    input.style.height = `${28 * scale}px`;
    input.style.textAlign = 'center';
    input.style.fontSize = `${scaledFontSize}px`;
    input.style.fontFamily = '"Segoe UI", sans-serif';
    input.style.color = '#374151';
    input.style.border = '1px solid #f97316';
    input.style.borderRadius = '4px';
    input.style.padding = `0 ${8 * scale}px`;
    input.style.background = '#ffffff';

    attachInputListeners(input, () => finishConnectionLabelEdit(state, callbacks), () => cancelConnectionLabelEdit(state, callbacks));
    state.connectionLabelInput = input;
    mountAndFocus(input);
}

export function finishConnectionLabelEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingConnection || !state.connectionLabelInput) return;
    const newLabel = state.connectionLabelInput.value.trim();
    if (newLabel !== state.editingConnection.label) callbacks.saveState();
    state.editingConnection.label = newLabel;
    callbacks.saveToStorage();
    cleanupConnectionLabel(state);
    callbacks.render();
}

function cancelConnectionLabelEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    cleanupConnectionLabel(state);
    callbacks.render();
}

function cleanupConnectionLabel(state: ElementEditState): void {
    if (state.connectionLabelInput?.parentElement) state.connectionLabelInput.remove();
    if (state.editingConnection) state.editingConnection.hideLabel = false;
    state.connectionLabelInput = null;
    state.editingConnection = null;
}

// --- Description ---
export function startDescriptionEdit(state: ElementEditState, component: Component, callbacks: EditCallbacks): void {
    if (state.editingDescriptionComponent) finishDescriptionEdit(state, callbacks);

    state.editingDescriptionComponent = component;
    component.hideDescription = true;
    callbacks.render();

    const screenPos = callbacks.worldToScreen(component.x, component.y);
    const scale = callbacks.getScale();
    const canvasRect = callbacks.getCanvasRect();
    const scaledWidth = component.width * scale;
    const scaledHeight = component.height * scale;
    const scaledFontSize = Math.max(10, Math.round(11 * scale));
    const descriptionOffset = 10;

    const input = createInput('text', 'description-edit-input');
    input.value = component.description || '';
    input.placeholder = 'Enter description...';
    input.style.left = `${canvasRect.left + screenPos.x}px`;
    input.style.top = `${canvasRect.top + screenPos.y + (scaledHeight / 2) + (descriptionOffset - 6) * scale}px`;
    input.style.width = `${scaledWidth}px`;
    input.style.height = `${24 * scale}px`;
    input.style.textAlign = 'center';
    input.style.fontSize = `${scaledFontSize}px`;
    input.style.fontFamily = '"Segoe UI", sans-serif';
    input.style.color = '#6B7280';
    input.style.fontWeight = '400';
    input.style.padding = `0 ${8 * scale}px`;
    input.style.background = 'transparent';

    attachInputListeners(input, () => finishDescriptionEdit(state, callbacks), () => cancelDescriptionEdit(state, callbacks));
    state.descriptionInput = input;
    mountAndFocus(input, 10);
}

export function finishDescriptionEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingDescriptionComponent || !state.descriptionInput) return;
    const newDescription = state.descriptionInput.value.trim();
    if (newDescription !== state.editingDescriptionComponent.description) callbacks.saveState();
    state.editingDescriptionComponent.description = newDescription;
    callbacks.saveToStorage();
    cleanupDescription(state);
    callbacks.render();
}

function cancelDescriptionEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    cleanupDescription(state);
    callbacks.render();
}

function cleanupDescription(state: ElementEditState): void {
    if (state.descriptionInput?.parentElement) state.descriptionInput.remove();
    if (state.editingDescriptionComponent) state.editingDescriptionComponent.hideDescription = false;
    state.descriptionInput = null;
    state.editingDescriptionComponent = null;
}

// --- Note ---
export function startNoteEdit(state: ElementEditState, note: Note, callbacks: EditCallbacks): void {
    if (state.editingNote) finishNoteEdit(state, callbacks);

    state.editingNote = note;
    note.hideText = true;
    callbacks.render();

    const screenPos = callbacks.worldToScreen(note.x, note.y);
    const scale = callbacks.getScale();
    const canvasRect = callbacks.getCanvasRect();
    const scaledFontSize = Math.max(10, Math.round(note.fontSize * scale));
    const scaledPadding = note.padding * scale;

    const textarea = document.createElement('textarea');
    textarea.value = note.text;
    textarea.className = 'text-element-edit';
    textarea.style.position = 'absolute';
    textarea.style.left = `${canvasRect.left + screenPos.x}px`;
    textarea.style.top = `${canvasRect.top + screenPos.y}px`;
    textarea.style.width = `${note.width * scale}px`;
    textarea.style.height = `${note.height * scale}px`;
    textarea.style.fontSize = `${scaledFontSize}px`;
    textarea.style.fontFamily = note.fontFamily;
    textarea.style.color = note.textColor;
    textarea.style.background = note.backgroundColor;
    textarea.style.padding = `${scaledPadding}px`;
    textarea.style.lineHeight = `${note.lineHeight}`;
    textarea.style.border = '2px solid #3B82F6';
    textarea.style.borderRadius = '0';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.boxSizing = 'border-box';
    textarea.style.zIndex = '1000';
    textarea.style.overflow = 'hidden';

    textarea.addEventListener('blur', () => finishNoteEdit(state, callbacks));
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { cancelNoteEdit(state, callbacks); }
    });

    document.body.appendChild(textarea);
    state.noteTextarea = textarea;
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(textarea.value.length, textarea.value.length); }, 10);
}

export function finishNoteEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingNote || !state.noteTextarea) return;
    const newText = state.noteTextarea.value;
    if (newText !== state.editingNote.text) {
        callbacks.saveState();
        state.editingNote.text = newText;
        callbacks.saveToStorage();
    }
    cleanupNote(state);
    callbacks.render();
}

function cancelNoteEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    cleanupNote(state);
    callbacks.render();
}

function cleanupNote(state: ElementEditState): void {
    if (state.noteTextarea?.parentElement) state.noteTextarea.remove();
    if (state.editingNote) state.editingNote.hideText = false;
    state.noteTextarea = null;
    state.editingNote = null;
}

// --- Label ---
export function startLabelEdit(state: ElementEditState, label: Label, callbacks: EditCallbacks): void {
    if (state.editingLabel) finishLabelEdit(state, callbacks);

    state.editingLabel = label;
    label.hideText = true;
    callbacks.render();

    const canvasRect = callbacks.getCanvasRect();
    const scale = callbacks.getScale();
    const screenPos = callbacks.worldToScreen(label.x, label.y);
    const scaledWidth = label.width * scale;
    const scaledHeight = label.height * scale;
    const scaledFontSize = Math.max(10, Math.round(label.fontSize * scale));

    const input = createInput('text', 'title-edit-input');
    input.value = label.text;
    input.style.left = `${canvasRect.left + screenPos.x}px`;
    input.style.top = `${canvasRect.top + screenPos.y}px`;
    input.style.width = `${scaledWidth}px`;
    input.style.height = `${scaledHeight}px`;
    input.style.textAlign = 'left';
    input.style.color = label.textColor;
    input.style.fontWeight = label.fontWeight;
    input.style.fontSize = `${scaledFontSize}px`;
    input.style.fontFamily = label.fontFamily;
    input.style.padding = `0 ${4 * scale}px`;
    input.style.background = '#ffffff';
    input.style.border = '1px solid #3B82F6';
    input.style.borderRadius = '2px';

    const finish = () => {
        if (!state.editingLabel) return;
        const newText = input.value.trim();
        if (newText && newText !== label.text) {
            callbacks.saveState();
            label.text = newText;
            callbacks.saveToStorage();
        }
        cleanupLabel(state);
        callbacks.render();
    };

    const cancel = () => { cleanupLabel(state); callbacks.render(); };

    attachInputListeners(input, finish, cancel);
    state.labelInput = input;
    mountAndFocus(input);
}

function finishLabelEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingLabel || !state.labelInput) return;
    const newText = state.labelInput.value.trim();
    if (newText && newText !== state.editingLabel.text) {
        callbacks.saveState();
        state.editingLabel.text = newText;
        callbacks.saveToStorage();
    }
    cleanupLabel(state);
    callbacks.render();
}

function cleanupLabel(state: ElementEditState): void {
    if (state.labelInput?.parentElement) state.labelInput.remove();
    if (state.editingLabel) state.editingLabel.hideText = false;
    state.labelInput = null;
    state.editingLabel = null;
}

// --- NumberedDot ---
export function startNumberEdit(state: ElementEditState, dot: NumberedDot, callbacks: EditCallbacks): void {
    if (state.editingDot) finishNumberEdit(state, callbacks);

    state.editingDot = dot;
    callbacks.render();

    const canvasRect = callbacks.getCanvasRect();
    const scale = callbacks.getScale();
    const screenPos = callbacks.worldToScreen(dot.x, dot.y);
    const scaledSize = dot.dotSize * scale;
    const inputWidth = 50 * scale;

    const input = createInput('number', 'title-edit-input');
    input.value = dot.number.toString();
    input.min = '0';
    input.style.left = `${canvasRect.left + screenPos.x + scaledSize / 2 - inputWidth / 2}px`;
    input.style.top = `${canvasRect.top + screenPos.y + scaledSize + 4 * scale}px`;
    input.style.width = `${inputWidth}px`;
    input.style.height = `${28 * scale}px`;
    input.style.textAlign = 'center';
    input.style.color = dot.dotColor;
    input.style.fontWeight = '700';
    input.style.fontSize = `${Math.max(10, Math.round(14 * scale))}px`;
    input.style.padding = `0 ${4 * scale}px`;
    input.style.background = '#ffffff';
    input.style.border = '2px solid ' + dot.dotColor;
    input.style.borderRadius = '4px';

    const finish = () => {
        if (!state.editingDot) return;
        const newNumber = parseInt(input.value);
        if (!isNaN(newNumber) && newNumber !== dot.number) {
            callbacks.saveState();
            dot.number = newNumber;
            callbacks.saveToStorage();
        }
        cleanupDot(state);
        callbacks.render();
    };

    const cancel = () => { cleanupDot(state); callbacks.render(); };

    attachInputListeners(input, finish, cancel);
    state.dotInput = input;
    mountAndFocus(input);
}

function finishNumberEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingDot || !state.dotInput) return;
    const newNumber = parseInt(state.dotInput.value);
    if (!isNaN(newNumber) && newNumber !== state.editingDot.number) {
        callbacks.saveState();
        state.editingDot.number = newNumber;
        callbacks.saveToStorage();
    }
    cleanupDot(state);
    callbacks.render();
}

function cleanupDot(state: ElementEditState): void {
    if (state.dotInput?.parentElement) state.dotInput.remove();
    state.dotInput = null;
    state.editingDot = null;
}

// --- Tag ---
export function startTagEdit(state: ElementEditState, tag: Tag, callbacks: EditCallbacks): void {
    if (state.editingTag) finishTagEdit(state, callbacks);

    state.editingTag = tag;
    tag.hideTitle = true;
    callbacks.render();

    const canvasRect = callbacks.getCanvasRect();
    const scale = callbacks.getScale();
    const screenPos = callbacks.worldToScreen(tag.x, tag.y);
    const scaledWidth = tag.width * scale;
    const scaledHeight = tag.height * scale;
    const scaledFontSize = Math.max(8, Math.round(tag.fontSize * scale));

    const input = createInput('text', 'title-edit-input');
    input.value = tag.text;
    input.style.left = `${canvasRect.left + screenPos.x}px`;
    input.style.top = `${canvasRect.top + screenPos.y}px`;
    input.style.width = `${scaledWidth}px`;
    input.style.height = `${scaledHeight}px`;
    input.style.textAlign = 'center';
    input.style.color = tag.textColor;
    input.style.fontWeight = '600';
    input.style.fontSize = `${scaledFontSize}px`;
    input.style.fontFamily = '"Segoe UI", sans-serif';
    input.style.padding = '0 4px';
    input.style.background = tag.backgroundColor;
    input.style.border = '2px solid #3B82F6';
    input.style.borderRadius = `${scaledHeight / 2}px`;

    const finish = () => {
        if (!state.editingTag) return;
        const newText = input.value.trim();
        if (newText && newText !== tag.text) {
            callbacks.saveState();
            tag.text = newText;
            tag.title = newText;
            const charWidth = tag.fontSize * 0.62;
            tag.width = Math.max(40, newText.length * charWidth + 20);
            callbacks.saveToStorage();
        }
        cleanupTag(state);
        callbacks.render();
    };

    const cancel = () => { cleanupTag(state); callbacks.render(); };

    attachInputListeners(input, finish, cancel);
    state.tagInput = input;
    mountAndFocus(input);
}

function finishTagEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingTag || !state.tagInput) return;
    const newText = state.tagInput.value.trim();
    if (newText && newText !== state.editingTag.text) {
        callbacks.saveState();
        state.editingTag.text = newText;
        state.editingTag.title = newText;
        const charWidth = state.editingTag.fontSize * 0.62;
        state.editingTag.width = Math.max(40, newText.length * charWidth + 20);
        callbacks.saveToStorage();
    }
    cleanupTag(state);
    callbacks.render();
}

function cleanupTag(state: ElementEditState): void {
    if (state.tagInput?.parentElement) state.tagInput.remove();
    if (state.editingTag) state.editingTag.hideTitle = false;
    state.tagInput = null;
    state.editingTag = null;
}

// --- Port number ---
export function startPortNumberEdit(state: ElementEditState, port: Port, callbacks: EditCallbacks): void {
    if (state.editingPort) finishPortNumberEdit(state, callbacks);

    state.editingPort = port;
    callbacks.render();

    const canvasRect = callbacks.getCanvasRect();
    const scale = callbacks.getScale();
    const screenPos = callbacks.worldToScreen(port.x, port.y);
    const size = 28 * scale;
    const inputWidth = 50 * scale;

    const input = createInput('number', 'title-edit-input');
    input.value = port.portNumber !== null ? port.portNumber.toString() : '';
    input.placeholder = '#';
    input.min = '0';
    input.style.left = `${canvasRect.left + screenPos.x + size / 2 - inputWidth / 2}px`;
    input.style.top = `${canvasRect.top + screenPos.y + size + 4 * scale}px`;
    input.style.width = `${inputWidth}px`;
    input.style.height = `${28 * scale}px`;
    input.style.textAlign = 'center';
    input.style.color = port.portColor;
    input.style.fontWeight = '700';
    input.style.fontSize = `${Math.max(10, Math.round(14 * scale))}px`;
    input.style.padding = `0 ${4 * scale}px`;
    input.style.background = '#ffffff';
    input.style.border = `2px solid ${port.portColor}`;
    input.style.borderRadius = '4px';

    const cancel = () => { cleanupPort(state); callbacks.render(); };

    attachInputListeners(input, () => finishPortNumberEdit(state, callbacks), cancel);
    state.portInput = input;
    mountAndFocus(input);
}

function finishPortNumberEdit(state: ElementEditState, callbacks: EditCallbacks): void {
    if (!state.editingPort || !state.portInput) return;
    const raw = state.portInput.value.trim();
    const newNumber = raw === '' ? null : parseInt(raw);
    const parsed = newNumber === null || !isNaN(newNumber) ? newNumber : state.editingPort.portNumber;
    if (parsed !== state.editingPort.portNumber) {
        callbacks.saveState();
        state.editingPort.portNumber = parsed;
        callbacks.saveToStorage();
    }
    cleanupPort(state);
    callbacks.render();
}

function cleanupPort(state: ElementEditState): void {
    if (state.portInput?.parentElement) state.portInput.remove();
    state.portInput = null;
    state.editingPort = null;
}

// --- Position updates ---
export function updateElementEditPositions(state: ElementEditState, callbacks: ElementEditExtraCallbacks): void {
    const scale = callbacks.getScale();
    const canvasRect = callbacks.getCanvasRect();

    if (state.editingConnection && state.connectionLabelInput) {
        const midpoint = callbacks.getMidpoint(state.editingConnection);
        if (midpoint) {
            const screenPos = callbacks.worldToScreen(midpoint.x, midpoint.y);
            const inputWidth = 120 * scale;
            state.connectionLabelInput.style.left = `${canvasRect.left + screenPos.x - inputWidth / 2}px`;
            state.connectionLabelInput.style.top = `${canvasRect.top + screenPos.y - 14 * scale}px`;
        }
    }

    if (state.editingDescriptionComponent && state.descriptionInput) {
        const comp = state.editingDescriptionComponent;
        const screenPos = callbacks.worldToScreen(comp.x, comp.y);
        const scaledWidth = comp.width * scale;
        const scaledHeight = comp.height * scale;
        state.descriptionInput.style.left = `${canvasRect.left + screenPos.x}px`;
        state.descriptionInput.style.top = `${canvasRect.top + screenPos.y + (scaledHeight / 2) + (10 - 6) * scale}px`;
        state.descriptionInput.style.width = `${scaledWidth}px`;
    }

    if (state.editingNote && state.noteTextarea) {
        const note = state.editingNote;
        const screenPos = callbacks.worldToScreen(note.x, note.y);
        state.noteTextarea.style.left = `${canvasRect.left + screenPos.x}px`;
        state.noteTextarea.style.top = `${canvasRect.top + screenPos.y}px`;
        state.noteTextarea.style.width = `${note.width * scale}px`;
        state.noteTextarea.style.height = `${note.height * scale}px`;
    }

    if (state.editingLabel && state.labelInput) {
        const screenPos = callbacks.worldToScreen(state.editingLabel.x, state.editingLabel.y);
        state.labelInput.style.left = `${canvasRect.left + screenPos.x}px`;
        state.labelInput.style.top = `${canvasRect.top + screenPos.y}px`;
        state.labelInput.style.width = `${state.editingLabel.width * scale}px`;
        state.labelInput.style.height = `${state.editingLabel.height * scale}px`;
    }

    if (state.editingDot && state.dotInput) {
        const dot = state.editingDot;
        const screenPos = callbacks.worldToScreen(dot.x, dot.y);
        const scaledSize = dot.dotSize * scale;
        const inputWidth = 50 * scale;
        state.dotInput.style.left = `${canvasRect.left + screenPos.x + scaledSize / 2 - inputWidth / 2}px`;
        state.dotInput.style.top = `${canvasRect.top + screenPos.y + scaledSize + 4 * scale}px`;
    }

    if (state.editingTag && state.tagInput) {
        const screenPos = callbacks.worldToScreen(state.editingTag.x, state.editingTag.y);
        state.tagInput.style.left = `${canvasRect.left + screenPos.x}px`;
        state.tagInput.style.top = `${canvasRect.top + screenPos.y}px`;
        state.tagInput.style.width = `${state.editingTag.width * scale}px`;
        state.tagInput.style.height = `${state.editingTag.height * scale}px`;
    }

    if (state.editingPort && state.portInput) {
        const port = state.editingPort;
        const screenPos = callbacks.worldToScreen(port.x, port.y);
        const size = 28 * scale;
        const inputWidth = 50 * scale;
        state.portInput.style.left = `${canvasRect.left + screenPos.x + size / 2 - inputWidth / 2}px`;
        state.portInput.style.top = `${canvasRect.top + screenPos.y + size + 4 * scale}px`;
    }
}
