/**
 * Title Edit Controller
 * Handles inline editing of element titles (Component, Module, Domain, Boundary, User)
 */

import {
    Component,
    Module,
    Domain,
    Port,
    System,
    Boundary,
    User,
    DOMAIN_TITLE_HEIGHT,
    MODULE_TITLE_HEIGHT,
    SYSTEM_TITLE_HEIGHT,
    type DiagramElement
} from '../canvas/index';
import type { EditCallbacks } from './editUtils';
import { createInput, attachInputListeners, mountAndFocus } from './editUtils';

export interface TitleEditState {
    editingComponent: DiagramElement | null;
    titleInput: HTMLInputElement | null;
}

export function createTitleEditState(): TitleEditState {
    return { editingComponent: null, titleInput: null };
}

function boundaryLabelInputPos(
    bnd: Boundary,
    canvasRect: DOMRect,
    screenPos: { x: number; y: number },
    scaledWidth: number,
    scaledHeight: number,
    scale: number
): { left: number; top: number } {
    const inputWidth = 150 * scale;
    const inputHeight = 28 * scale;
    const pad = 8 * scale;
    const x = canvasRect.left + screenPos.x;
    const y = canvasRect.top + screenPos.y;
    if (bnd.labelPosition === 'top-right')    return { left: x + scaledWidth - pad - inputWidth, top: y + pad };
    if (bnd.labelPosition === 'bottom-left')  return { left: x + pad,                            top: y + scaledHeight - pad - inputHeight };
    if (bnd.labelPosition === 'bottom-right') return { left: x + scaledWidth - pad - inputWidth, top: y + scaledHeight - pad - inputHeight };
    return { left: x + pad, top: y + pad }; // top-left (default)
}

export function startTitleEdit(state: TitleEditState, component: DiagramElement, callbacks: EditCallbacks): void {
    if (state.editingComponent) finishTitleEdit(state, callbacks);

    state.editingComponent = component;
    component.hideTitle = true;
    callbacks.render();

    const input = createInput('text', 'title-edit-input');
    input.value = component.title;

    const canvasRect = callbacks.getCanvasRect();
    const scale = callbacks.getScale();
    const screenPos = callbacks.worldToScreen(component.x, component.y);
    const scaledWidth = component.width * scale;
    const scaledHeight = component.height * scale;
    const scaledFontSize = Math.max(10, Math.round(14 * scale));

    const isContainer = component instanceof Module || component instanceof Domain || component instanceof System;
    const isBoundary = component instanceof Boundary;
    const isUser = component instanceof User;
    const isPort = component instanceof Port;

    if (isPort) {
        const inputWidth = 80 * scale;
        input.style.left = `${canvasRect.left + screenPos.x + scaledWidth / 2 - inputWidth / 2}px`;
        input.style.top = `${canvasRect.top + screenPos.y + scaledHeight + 3 * scale}px`;
        input.style.width = `${inputWidth}px`;
        input.style.textAlign = 'center';
        input.style.color = '#334155';
        input.style.fontWeight = '500';
        input.style.fontSize = `${Math.max(8, Math.round(10 * scale))}px`;
    } else if (isBoundary) {
        const { left, top } = boundaryLabelInputPos(component, canvasRect, screenPos, scaledWidth, scaledHeight, scale);
        input.style.left = `${left}px`;
        input.style.top = `${top}px`;
        input.style.width = `${150 * scale}px`;
        input.style.textAlign = 'left';
        input.style.color = '#64748B';
        input.style.fontWeight = '400';
        input.style.fontSize = `${Math.max(10, Math.round(12 * scale))}px`;
    } else if (isUser) {
        const centerX = screenPos.x + scaledWidth / 2;
        const titleY = screenPos.y + scaledHeight + 14 * scale;
        const inputWidth = 120 * scale;
        input.style.left = `${canvasRect.left + centerX - inputWidth / 2}px`;
        input.style.top = `${canvasRect.top + titleY - 14 * scale}px`;
        input.style.width = `${inputWidth}px`;
        input.style.textAlign = 'center';
        input.style.color = '#5B21B6';
        input.style.fontWeight = '600';
        input.style.fontSize = `${Math.max(10, Math.round(12 * scale))}px`;
    } else if (isContainer) {
        const titleHeight = component instanceof System ? SYSTEM_TITLE_HEIGHT : component instanceof Domain ? DOMAIN_TITLE_HEIGHT : MODULE_TITLE_HEIGHT;
        input.style.left = `${canvasRect.left + screenPos.x}px`;
        input.style.top = `${canvasRect.top + screenPos.y + (titleHeight / 2 - 14) * scale}px`;
        input.style.width = `${scaledWidth}px`;
        input.style.textAlign = 'center';
        input.style.color = '#1F2937';
        input.style.fontWeight = '600';
        input.style.fontSize = `${scaledFontSize}px`;
    } else {
        const hasDescription = component instanceof Component && component.description && component.description.length > 0;
        const titleOffset = hasDescription ? -10 : 0;
        input.style.left = `${canvasRect.left + screenPos.x}px`;
        input.style.top = `${canvasRect.top + screenPos.y + (scaledHeight / 2) + (titleOffset - 14) * scale}px`;
        input.style.width = `${scaledWidth}px`;
        input.style.textAlign = 'center';
        input.style.color = '#1F2937';
        input.style.fontWeight = '600';
        input.style.fontSize = `${scaledFontSize}px`;
    }

    input.style.height = `${28 * scale}px`;
    input.style.padding = `0 ${8 * scale}px`;
    input.style.background = 'transparent';

    if (isBoundary || isPort) {
        input.style.background = 'rgba(255,255,255,0.85)';
        input.style.border = `${Math.max(1, scale)}px solid #94A3B8`;
        input.style.borderRadius = `${4 * scale}px`;
    }

    attachInputListeners(input, () => finishTitleEdit(state, callbacks), () => cancelTitleEdit(state, callbacks));
    state.titleInput = input;
    mountAndFocus(input);
}

export function finishTitleEdit(state: TitleEditState, callbacks: EditCallbacks): void {
    if (!state.editingComponent || !state.titleInput) return;

    const newTitle = state.titleInput.value.trim();
    if (newTitle && newTitle !== state.editingComponent.title) {
        callbacks.saveState();
        state.editingComponent.title = newTitle;
        callbacks.saveToStorage();
    }

    cleanupTitleEdit(state);
    callbacks.render();
}

export function cancelTitleEdit(state: TitleEditState, callbacks: EditCallbacks): void {
    cleanupTitleEdit(state);
    callbacks.render();
}

function cleanupTitleEdit(state: TitleEditState): void {
    const input = state.titleInput;
    const component = state.editingComponent;

    state.titleInput = null;
    state.editingComponent = null;

    if (input?.parentElement) input.remove();
    if (component) component.hideTitle = false;
}

export function updateTitlePosition(state: TitleEditState, callbacks: EditCallbacks): void {
    if (!state.editingComponent || !state.titleInput) return;

    const comp = state.editingComponent;
    const scale = callbacks.getScale();
    const canvasRect = callbacks.getCanvasRect();
    const screenPos = callbacks.worldToScreen(comp.x, comp.y);
    const scaledWidth = comp.width * scale;
    const scaledHeight = comp.height * scale;

    const isContainer = comp instanceof Module || comp instanceof Domain;
    const isBoundary = comp instanceof Boundary;
    const isUser = comp instanceof User;
    const isPort = comp instanceof Port;

    if (isPort) {
        const inputWidth = 80 * scale;
        state.titleInput.style.left = `${canvasRect.left + screenPos.x + scaledWidth / 2 - inputWidth / 2}px`;
        state.titleInput.style.top = `${canvasRect.top + screenPos.y + scaledHeight + 3 * scale}px`;
    } else if (isBoundary) {
        const { left, top } = boundaryLabelInputPos(comp, canvasRect, screenPos, scaledWidth, scaledHeight, scale);
        state.titleInput.style.left = `${left}px`;
        state.titleInput.style.top = `${top}px`;
    } else if (isUser) {
        const centerX = screenPos.x + scaledWidth / 2;
        const titleY = screenPos.y + scaledHeight + 14 * scale;
        const inputWidth = 120 * scale;
        state.titleInput.style.left = `${canvasRect.left + centerX - inputWidth / 2}px`;
        state.titleInput.style.top = `${canvasRect.top + titleY - 14 * scale}px`;
    } else if (isContainer) {
        const titleHeight = comp instanceof System ? SYSTEM_TITLE_HEIGHT : comp instanceof Domain ? DOMAIN_TITLE_HEIGHT : MODULE_TITLE_HEIGHT;
        state.titleInput.style.left = `${canvasRect.left + screenPos.x}px`;
        state.titleInput.style.top = `${canvasRect.top + screenPos.y + (titleHeight / 2 - 14) * scale}px`;
        state.titleInput.style.width = `${scaledWidth}px`;
    } else {
        const hasDescription = comp instanceof Component && comp.description && comp.description.length > 0;
        const titleOffset = hasDescription ? -10 : 0;
        state.titleInput.style.left = `${canvasRect.left + screenPos.x}px`;
        state.titleInput.style.top = `${canvasRect.top + screenPos.y + (scaledHeight / 2) + (titleOffset - 14) * scale}px`;
        state.titleInput.style.width = `${scaledWidth}px`;
    }
}
