/**
 * Clipboard Handler
 * Manages copy/paste and PNG export
 */

import {
    Boundary,
    Component,
    Domain,
    Label,
    Module,
    Note,
    NumberedDot,
    System,
    Tag,
    User,
    elementRegistry,
    type DiagramElement
} from '../canvas/index';
import type { EditorState } from './editorState';
import type { SerializedComponent } from './editorTypes';
import { getSortedComponentsForRendering } from './selectionHandler';

export function copy(state: EditorState, clipboard: SerializedComponent[]): boolean {
    if (state.selectedElements.length === 0) return false;

    clipboard.length = 0;
    for (const el of state.selectedElements) {
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
        if (el instanceof Note || el instanceof Label) {
            base.text = el.text;
            if (el.fontSize !== 14) {
                base.fontSize = el.fontSize;
            }
        }
        if (el instanceof Note) {
            if (el.backgroundColor !== '#FEF9E7') base.backgroundColor = el.backgroundColor;
            if (el.textColor !== '#5D4E37') base.textColor = el.textColor;
            if (el.accentColor !== '#F6E05E') base.accentColor = el.accentColor;
            if (el.borderColor !== '#E8DFC0') base.noteBorderColor = el.borderColor;
        }
        if (el instanceof NumberedDot) {
            base.number = el.number;
        }
        if (el instanceof Tag) {
            base.text = el.text;
            base.backgroundColor = el.backgroundColor;
            base.textColor = el.textColor;
            if (el.fontSize !== 11) {
                base.fontSize = el.fontSize;
            }
        }
        if (el instanceof Boundary && el.labelPosition !== 'top-left') {
            base.labelPosition = el.labelPosition;
        }
        if ((el instanceof Component || el instanceof User || el instanceof Module || el instanceof Domain || el instanceof System || el instanceof Boundary) && el.borderColor) {
            base.borderColor = el.borderColor;
        }
        clipboard.push(base);
    }

    return true;
}

export function paste(
    state: EditorState,
    clipboard: SerializedComponent[],
    saveState: () => void,
    saveToStorage: () => void,
    render: () => void
): boolean {
    if (clipboard.length === 0) return false;

    saveState();

    const offset = 20;

    state.selectedElements.forEach(el => el.selected = false);
    state.selectedElements = [];

    const newElements: DiagramElement[] = [];
    clipboard.forEach(item => {
        const newItem = {
            ...item,
            id: undefined,
            x: item.x + offset,
            y: item.y + offset,
            parentId: null
        };
        const element = elementRegistry.createInstance(item.type, newItem);
        state.elements.push(element);
        newElements.push(element);
    });

    newElements.forEach(el => {
        el.selected = true;
        state.selectedElements.push(el);
    });

    // Update clipboard positions for subsequent pastes
    for (let i = 0; i < clipboard.length; i++) {
        clipboard[i] = { ...clipboard[i]!, x: clipboard[i]!.x + offset, y: clipboard[i]!.y + offset };
    }

    render();
    saveToStorage();

    return true;
}

export function exportPNG(state: EditorState): void {
    if (state.elements.length === 0) return;

    const hasSelection = state.selectedElements.length > 0;
    const selectedIds = new Set(state.selectedElements.map(el => el.id));
    const exportElements = hasSelection ? state.selectedElements : state.elements;
    const exportConnections = hasSelection
        ? state.connections.filter(c =>
            selectedIds.has(c.sourcePoint.componentId) && selectedIds.has(c.targetPoint.componentId))
        : state.connections;

    const padding = 40;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of exportElements) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
        if (el instanceof User) {
            maxY = Math.max(maxY, el.y + el.height + 30);
        }
    }

    for (const conn of exportConnections) {
        const source = state.elements.find(c => c.id === conn.sourcePoint.componentId);
        const target = state.elements.find(c => c.id === conn.targetPoint.componentId);
        if (source && target) {
            const sp = source.getPointOnBorder(conn.sourcePoint.side, conn.sourcePoint.offset);
            const tp = target.getPointOnBorder(conn.targetPoint.side, conn.targetPoint.offset);
            minX = Math.min(minX, sp.x, tp.x);
            minY = Math.min(minY, sp.y, tp.y);
            maxX = Math.max(maxX, sp.x, tp.x);
            maxY = Math.max(maxY, sp.y, tp.y);
        }
    }

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const offscreen = document.createElement('canvas');
    offscreen.width = width * 2;
    offscreen.height = height * 2;
    const ctx = offscreen.getContext('2d')!;
    ctx.scale(2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(padding - minX, padding - minY);

    const savedSelected: boolean[] = [];
    const savedHovered: boolean[] = [];
    for (const el of state.elements) {
        savedSelected.push(el.selected);
        savedHovered.push(el.hovered);
        el.selected = false;
        el.hovered = false;
    }
    const savedConnSelected: boolean[] = [];
    for (const conn of state.connections) {
        savedConnSelected.push(conn.selected);
        conn.selected = false;
    }

    const exportSet = new Set(exportElements.map(el => el.id));
    const sorted = getSortedComponentsForRendering(state);
    for (const el of sorted) {
        if (exportSet.has(el.id)) {
            el.draw(ctx);
        }
    }
    for (const conn of exportConnections) {
        conn.draw(ctx, state.elements);
    }

    for (let i = 0; i < state.elements.length; i++) {
        state.elements[i]!.selected = savedSelected[i]!;
        state.elements[i]!.hovered = savedHovered[i]!;
    }
    for (let i = 0; i < state.connections.length; i++) {
        state.connections[i]!.selected = savedConnSelected[i]!;
    }

    ctx.restore();

    offscreen.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.png';
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}
