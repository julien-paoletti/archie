/**
 * Inline Edit Controller
 * Thin coordinator that delegates to focused edit controllers
 */

import { Component, Connection, Label, Module, Note, NumberedDot, Port, Tag, type DiagramElement } from '../canvas/index';
import type { EditCallbacks } from './editUtils';
import type { ElementEditExtraCallbacks } from './elementEditController';
import { createTitleEditState, startTitleEdit, finishTitleEdit, cancelTitleEdit, updateTitlePosition, type TitleEditState } from './titleEditController';
import {
    createElementEditState,
    isElementEditing,
    startConnectionLabelEdit,
    startDescriptionEdit,
    startLabelEdit,
    startNoteEdit,
    startNumberEdit,
    startPortNumberEdit,
    startTagEdit,
    updateElementEditPositions,
    type ElementEditState
} from './elementEditController';

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

    isEditing(): boolean {
        return this.titleState.editingComponent !== null || isElementEditing(this.elementState);
    }

    updatePositions(): void {
        updateTitlePosition(this.titleState, this.callbacks);
        updateElementEditPositions(this.elementState, this.extraCallbacks);
    }

    startTitleEdit(component: DiagramElement): void { startTitleEdit(this.titleState, component, this.callbacks); }
    finishTitleEdit(): void { finishTitleEdit(this.titleState, this.callbacks); }
    cancelTitleEdit(): void { cancelTitleEdit(this.titleState, this.callbacks); }

    startConnectionLabelEdit(connection: Connection): void { startConnectionLabelEdit(this.elementState, connection, this.extraCallbacks); }
    startDescriptionEdit(component: Component | Module): void { startDescriptionEdit(this.elementState, component, this.extraCallbacks); }
    startNoteEdit(note: Note): void { startNoteEdit(this.elementState, note, this.extraCallbacks); }
    startLabelEdit(label: Label): void { startLabelEdit(this.elementState, label, this.extraCallbacks); }
    startNumberEdit(dot: NumberedDot): void { startNumberEdit(this.elementState, dot, this.extraCallbacks); }
    startTagEdit(tag: Tag): void { startTagEdit(this.elementState, tag, this.extraCallbacks); }
    startPortNumberEdit(port: Port): void { startPortNumberEdit(this.elementState, port, this.extraCallbacks); }
}
