/**
 * Inline Edit Controller
 * Thin coordinator that delegates to focused edit controllers
 */

import { Component, Connection, Label, Note, NumberedDot, Tag, type DiagramElement } from '../canvas/index';
import type { EditCallbacks } from './editUtils';
import type { ElementEditExtraCallbacks } from './elementEditController';
import { createTitleEditState, startTitleEdit, finishTitleEdit, cancelTitleEdit, updateTitlePosition, type TitleEditState } from './titleEditController';
import {
    createElementEditState,
    startConnectionLabelEdit as _startConnLabel,
    finishConnectionLabelEdit as _finishConnLabel,
    startDescriptionEdit as _startDesc,
    finishDescriptionEdit as _finishDesc,
    startNoteEdit as _startNote,
    finishNoteEdit as _finishNote,
    startLabelEdit as _startLabel,
    startNumberEdit as _startNumber,
    startTagEdit as _startTag,
    updateElementEditPositions,
    type ElementEditState
} from './elementEditController';

export interface EditState {
    editingComponent: DiagramElement | null;
    titleInput: HTMLInputElement | null;
    editingConnection: Connection | null;
    connectionLabelInput: HTMLInputElement | null;
    editingDescriptionComponent: Component | null;
    descriptionInput: HTMLInputElement | null;
    editingNote: Note | null;
    noteTextarea: HTMLTextAreaElement | null;
}

export { type EditCallbacks } from './editUtils';

export class InlineEditController {
    private titleState: TitleEditState;
    private elementState: ElementEditState;
    private callbacks: EditCallbacks;
    private extraCallbacks: ElementEditExtraCallbacks;

    constructor(callbacks: EditCallbacks & { getMidpoint: (connection: Connection) => { x: number; y: number } | null }) {
        this.titleState = createTitleEditState();
        this.elementState = createElementEditState();
        this.callbacks = callbacks;
        this.extraCallbacks = callbacks;
    }

    getState(): EditState {
        return {
            editingComponent: this.titleState.editingComponent,
            titleInput: this.titleState.titleInput,
            editingConnection: this.elementState.editingConnection,
            connectionLabelInput: this.elementState.connectionLabelInput,
            editingDescriptionComponent: this.elementState.editingDescriptionComponent,
            descriptionInput: this.elementState.descriptionInput,
            editingNote: this.elementState.editingNote,
            noteTextarea: this.elementState.noteTextarea
        };
    }

    isEditing(): boolean {
        return this.titleState.editingComponent !== null ||
            this.elementState.editingConnection !== null ||
            this.elementState.editingDescriptionComponent !== null ||
            this.elementState.editingNote !== null ||
            this.elementState.editingLabel !== null ||
            this.elementState.editingDot !== null ||
            this.elementState.editingTag !== null;
    }

    updatePositions(): void {
        updateTitlePosition(this.titleState, this.callbacks);
        updateElementEditPositions(this.elementState, this.extraCallbacks);
    }

    startTitleEdit(component: DiagramElement): void { startTitleEdit(this.titleState, component, this.callbacks); }
    finishTitleEdit(): void { finishTitleEdit(this.titleState, this.callbacks); }
    cancelTitleEdit(): void { cancelTitleEdit(this.titleState, this.callbacks); }

    startConnectionLabelEdit(connection: Connection): void { _startConnLabel(this.elementState, connection, this.extraCallbacks); }
    finishConnectionLabelEdit(): void { _finishConnLabel(this.elementState, this.callbacks); }

    startDescriptionEdit(component: Component): void { _startDesc(this.elementState, component, this.callbacks); }
    finishDescriptionEdit(): void { _finishDesc(this.elementState, this.callbacks); }

    startNoteEdit(note: Note): void { _startNote(this.elementState, note, this.callbacks); }
    finishNoteEdit(): void { _finishNote(this.elementState, this.callbacks); }

    startLabelEdit(label: Label): void { _startLabel(this.elementState, label, this.callbacks); }
    startNumberEdit(dot: NumberedDot): void { _startNumber(this.elementState, dot, this.callbacks); }
    startTagEdit(tag: Tag): void { _startTag(this.elementState, tag, this.callbacks); }
}
