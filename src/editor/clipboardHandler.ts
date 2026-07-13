/**
 * Clipboard Handler
 * Manages copy/paste and PNG export
 */

import {
    Boundary,
    Component,
    Connection,
    Domain,
    Label,
    Module,
    Note,
    NumberedDot,
    Port,
    System,
    Tag,
    User,
    elementRegistry,
    type DiagramElement
} from '../canvas/index';
import type { EditorContext, EditorState } from './editorState';
import type { SerializedComponent, SerializedConnection } from './editorTypes';
import { getSortedComponentsForRendering } from './selectionHandler';

export interface ClipboardData {
    elements: SerializedComponent[];
    connections: SerializedConnection[];
}

export function copy(state: EditorState, clipboard: ClipboardData): boolean {
    if (state.selectedElements.length === 0) return false;

    clipboard.elements.length = 0;
    clipboard.connections.length = 0;

    const selectedIds = new Set(state.selectedElements.map(el => el.id));

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
        }
        if ((el instanceof Component || el instanceof Module) && el.description) {
            base.description = el.description;
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
        if (el instanceof Port) {
            if (el.portNumber !== null) base.portNumber = el.portNumber;
            if (el.portColor !== '#475569') base.portColor = el.portColor;
        }
        if (el instanceof Boundary && el.labelPosition !== 'top-left') {
            base.labelPosition = el.labelPosition;
        }
        if ((el instanceof Module || el instanceof Domain || el instanceof System) && el.titlePosition !== 'top') {
            base.titlePosition = el.titlePosition;
        }
        if ((el instanceof Component || el instanceof User || el instanceof Module || el instanceof Domain || el instanceof System || el instanceof Boundary) && el.borderColor) {
            base.borderColor = el.borderColor;
        }
        clipboard.elements.push(base);
    }

    // Copy connections between selected elements
    for (const conn of state.connections) {
        if (selectedIds.has(conn.sourcePoint.componentId) && selectedIds.has(conn.targetPoint.componentId)) {
            clipboard.connections.push({
                id: conn.id,
                sourcePoint: { ...conn.sourcePoint },
                targetPoint: { ...conn.targetPoint },
                ...(conn.strokeColor !== '#64748B' && { strokeColor: conn.strokeColor }),
                ...(conn.strokeWidth !== 2 && { strokeWidth: conn.strokeWidth }),
                ...(conn.label && { label: conn.label }),
                ...(conn.lineStyle !== 'solid' && { lineStyle: conn.lineStyle }),
                ...(conn.arrowType !== 'filled' && { arrowType: conn.arrowType }),
                ...(conn.sourceArrowType !== 'none' && { sourceArrowType: conn.sourceArrowType }),
                ...(conn.curveType !== 'bezier' && { curveType: conn.curveType }),
                ...(conn.customControlPoint1 && { customControlPoint1: { ...conn.customControlPoint1 } }),
                ...(conn.customControlPoint2 && { customControlPoint2: { ...conn.customControlPoint2 } }),
                ...(conn.intermediateAnchors.length > 0 && { intermediateAnchors: conn.intermediateAnchors.map(a => ({ position: { ...a.position }, handleIn: { ...a.handleIn }, handleOut: { ...a.handleOut } })) }),
            });
        }
    }

    return true;
}

export function paste(
    state: EditorState,
    clipboard: ClipboardData,
    ctx: EditorContext
): boolean {
    if (clipboard.elements.length === 0) return false;

    ctx.saveState();

    const offset = 20;

    state.selectedElements.forEach(el => el.selected = false);
    state.selectedElements = [];

    // Map old element IDs to newly created elements
    const idMap = new Map<string, string>();
    const newElements: DiagramElement[] = [];

    clipboard.elements.forEach(item => {
        const newItem = {
            ...item,
            id: undefined,
            x: item.x + offset,
            y: item.y + offset,
            parentId: null
        };
        const element = elementRegistry.createInstance(item.type, newItem);
        idMap.set(item.id, element.id);
        state.elements.push(element);
        newElements.push(element);
    });

    newElements.forEach(el => {
        el.selected = true;
        state.selectedElements.push(el);
    });

    // Recreate connections with remapped IDs
    for (const connData of clipboard.connections) {
        const newSourceId = idMap.get(connData.sourcePoint.componentId);
        const newTargetId = idMap.get(connData.targetPoint.componentId);
        if (newSourceId && newTargetId) {
            const conn = new Connection({
                ...connData,
                id: undefined as any,
                sourcePoint: { ...connData.sourcePoint, componentId: newSourceId },
                targetPoint: { ...connData.targetPoint, componentId: newTargetId },
            });
            state.connections.push(conn);
        }
    }

    for (let i = 0; i < clipboard.elements.length; i++) {
        clipboard.elements[i] = { ...clipboard.elements[i]!, x: clipboard.elements[i]!.x + offset, y: clipboard.elements[i]!.y + offset };
    }
    for (const conn of clipboard.connections) {
        if (conn.customControlPoint1) conn.customControlPoint1 = { x: conn.customControlPoint1.x + offset, y: conn.customControlPoint1.y + offset };
        if (conn.customControlPoint2) conn.customControlPoint2 = { x: conn.customControlPoint2.x + offset, y: conn.customControlPoint2.y + offset };
        if (conn.intermediateAnchors) {
            for (const a of conn.intermediateAnchors) {
                a.position.x += offset; a.position.y += offset;
                a.handleIn.x += offset; a.handleIn.y += offset;
                a.handleOut.x += offset; a.handleOut.y += offset;
            }
        }
    }

    ctx.render();
    ctx.saveToStorage();

    return true;
}

function renderPNG(state: EditorState): HTMLCanvasElement | null {
    if (state.elements.length === 0) return null;

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

    return offscreen;
}

export function exportPNG(state: EditorState): void {
    const offscreen = renderPNG(state);
    if (!offscreen) return;
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

export function copyPNG(state: EditorState, onDone: (err?: Error) => void): void {
    const offscreen = renderPNG(state);
    if (!offscreen) return;
    offscreen.toBlob((blob) => {
        if (!blob) return;
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            .then(() => onDone())
            .catch((err) => onDone(err instanceof Error ? err : new Error(String(err))));
    }, 'image/png');
}
