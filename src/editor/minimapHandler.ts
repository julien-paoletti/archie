/**
 * Minimap Handler
 * Renders a small overview of the diagram with viewport navigation
 */

import {
    Boundary,
    Component,
    Domain,
    Module,
    System,
    Note,
    NumberedDot,
    Tag,
    User,
    Label,
    type DiagramElement,
    MINIMAP_ELEMENT_COLORS,
    MINIMAP_CONNECTION_COLOR,
    MINIMAP_VIEWPORT_FILL,
    MINIMAP_VIEWPORT_STROKE,
} from '../canvas/index';
import type { EditorState } from './editorState';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_PADDING = 40;

interface MinimapBounds {
    minX: number;
    minY: number;
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface MinimapCallbacks {
    render: () => void;
    saveToStorage: () => void;
}

function getElementColor(el: DiagramElement): string {
    if (el instanceof System) return MINIMAP_ELEMENT_COLORS.system;
    if (el instanceof Domain) return MINIMAP_ELEMENT_COLORS.domain;
    if (el instanceof Module) return MINIMAP_ELEMENT_COLORS.module;
    if (el instanceof Note) return (el as Note).backgroundColor;
    if (el instanceof Tag) return (el as Tag).backgroundColor;
    if (el instanceof Boundary) return 'transparent';
    if (el instanceof NumberedDot) return MINIMAP_ELEMENT_COLORS.numberedDot;
    if (el instanceof Label) return 'transparent';
    if (el instanceof User) return MINIMAP_ELEMENT_COLORS.user;
    if (el instanceof Component) return MINIMAP_ELEMENT_COLORS.component;
    return MINIMAP_ELEMENT_COLORS.fallback;
}

function getElementBorderColor(el: DiagramElement): string {
    if (el instanceof Boundary) return (el as Boundary).borderColor;
    if (el instanceof Component) return (el as Component).borderColor;
    if (el instanceof User) return (el as User).borderColor;
    if (el instanceof Domain || el instanceof Module || el instanceof System) return el.borderColor;
    if (el instanceof Note) return (el as Note).borderColor;
    if (el instanceof Label || el instanceof NumberedDot || el instanceof Tag) return 'transparent';
    return '#D4D4D8';
}

function calculateBounds(state: EditorState): MinimapBounds {
    const containerRect = state.container.getBoundingClientRect();
    const viewLeft = -state.panOffset.x / state.scale;
    const viewTop = -state.panOffset.y / state.scale;
    const viewRight = viewLeft + containerRect.width / state.scale;
    const viewBottom = viewTop + containerRect.height / state.scale;

    let minX = viewLeft, minY = viewTop;
    let maxX = viewRight, maxY = viewBottom;

    for (const el of state.elements) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
    }

    minX -= MINIMAP_PADDING;
    minY -= MINIMAP_PADDING;
    const width = maxX - minX + MINIMAP_PADDING;
    const height = maxY - minY + MINIMAP_PADDING;

    const scaleX = MINIMAP_WIDTH / width;
    const scaleY = MINIMAP_HEIGHT / height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (MINIMAP_WIDTH - width * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - height * scale) / 2;

    return { minX, minY, width, height, scale, offsetX, offsetY };
}

function worldToMinimap(worldX: number, worldY: number, bounds: MinimapBounds): { x: number; y: number } {
    return {
        x: (worldX - bounds.minX) * bounds.scale + bounds.offsetX,
        y: (worldY - bounds.minY) * bounds.scale + bounds.offsetY
    };
}

function minimapToWorld(mmX: number, mmY: number, bounds: MinimapBounds): { x: number; y: number } {
    return {
        x: (mmX - bounds.offsetX) / bounds.scale + bounds.minX,
        y: (mmY - bounds.offsetY) / bounds.scale + bounds.minY
    };
}

export function initMinimap(state: EditorState): void {
    const container = document.createElement('div');
    container.className = 'minimap-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'minimap-canvas';
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    canvas.style.width = `${MINIMAP_WIDTH}px`;
    canvas.style.height = `${MINIMAP_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    container.appendChild(canvas);
    state.container.appendChild(container);

    state.minimapCanvas = canvas;
    state.minimapCtx = ctx;
    state.minimapContainer = container;
}

export function setupMinimapEvents(state: EditorState, callbacks: MinimapCallbacks): void {
    if (!state.minimapCanvas) return;
    const canvas = state.minimapCanvas;

    canvas.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        state.isDraggingMinimap = true;
        navigateToMinimapPosition(state, e, callbacks);
    });

    canvas.addEventListener('mousemove', (e) => {
        e.stopPropagation();
        if (state.isDraggingMinimap) {
            navigateToMinimapPosition(state, e, callbacks);
        }
    });

    const onMouseUp = (e: MouseEvent) => {
        if (state.isDraggingMinimap) {
            state.isDraggingMinimap = false;
            callbacks.saveToStorage();
        }
    };

    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
}

function navigateToMinimapPosition(state: EditorState, e: MouseEvent, callbacks: MinimapCallbacks): void {
    const rect = state.minimapCanvas!.getBoundingClientRect();
    const mmX = (e.clientX - rect.left) * (MINIMAP_WIDTH / rect.width);
    const mmY = (e.clientY - rect.top) * (MINIMAP_HEIGHT / rect.height);

    const bounds = calculateBounds(state);
    const world = minimapToWorld(mmX, mmY, bounds);

    const containerRect = state.container.getBoundingClientRect();
    const viewWidth = containerRect.width / state.scale;
    const viewHeight = containerRect.height / state.scale;

    state.panOffset.x = -(world.x - viewWidth / 2) * state.scale;
    state.panOffset.y = -(world.y - viewHeight / 2) * state.scale;

    callbacks.render();
}

export function renderMinimap(state: EditorState): void {
    const ctx = state.minimapCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    const bounds = calculateBounds(state);

    // Draw elements
    for (const el of state.elements) {
        const tl = worldToMinimap(el.x, el.y, bounds);
        const w = el.width * bounds.scale;
        const h = el.height * bounds.scale;

        const fill = getElementColor(el);
        if (fill !== 'transparent') {
            ctx.fillStyle = fill;
            if (el instanceof User) {
                ctx.beginPath();
                ctx.arc(tl.x + w / 2, tl.y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (el instanceof NumberedDot) {
                ctx.beginPath();
                ctx.arc(tl.x + w / 2, tl.y + h / 2, Math.max(2, Math.min(w, h) / 2), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(tl.x, tl.y, Math.max(2, w), Math.max(2, h));
            }
        }

        const border = getElementBorderColor(el);
        if (border !== 'transparent') {
            ctx.strokeStyle = border;
            ctx.lineWidth = 0.5;
            if (el instanceof User) {
                ctx.beginPath();
                ctx.arc(tl.x + w / 2, tl.y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
                ctx.stroke();
            } else if (!(el instanceof NumberedDot)) {
                ctx.strokeRect(tl.x, tl.y, Math.max(2, w), Math.max(2, h));
            }
        }
    }

    // Draw connections as simple lines
    ctx.strokeStyle = MINIMAP_CONNECTION_COLOR;
    ctx.lineWidth = 0.5;
    for (const conn of state.connections) {
        const src = state.elements.find(c => c.id === conn.sourcePoint.componentId);
        const tgt = state.elements.find(c => c.id === conn.targetPoint.componentId);
        if (!src || !tgt) continue;

        const s = worldToMinimap(src.x + src.width / 2, src.y + src.height / 2, bounds);
        const t = worldToMinimap(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, bounds);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
    }

    // Draw viewport rectangle
    const containerRect = state.container.getBoundingClientRect();
    const viewLeft = -state.panOffset.x / state.scale;
    const viewTop = -state.panOffset.y / state.scale;
    const viewWidth = containerRect.width / state.scale;
    const viewHeight = containerRect.height / state.scale;

    const vtl = worldToMinimap(viewLeft, viewTop, bounds);
    const vw = viewWidth * bounds.scale;
    const vh = viewHeight * bounds.scale;

    ctx.fillStyle = MINIMAP_VIEWPORT_FILL;
    ctx.fillRect(vtl.x, vtl.y, vw, vh);
    ctx.strokeStyle = MINIMAP_VIEWPORT_STROKE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(vtl.x, vtl.y, vw, vh);
    ctx.setLineDash([]);
}
