import {
    CanvasRenderer,
    Connection,
    Domain,
    Module,
    System,
    NumberedDot,
    Tag,
    Port,
    Boundary,
    elementRegistry,
    type DiagramElement,
} from '../../src/canvas/index';
import type { SerializedDiagram } from '../../src/editor/editorTypes';

// ============================================================================
// Types
// ============================================================================

export interface ViewerOptions {
    /** Initial zoom level (default: 1). */
    scale?: number;
    /** Initial pan X offset in pixels (default: 0). */
    panX?: number;
    /** Initial pan Y offset in pixels (default: 0). */
    panY?: number;
    /** Whether to restore viewport from the diagram's saved viewport (default: true). */
    restoreViewport?: boolean;
    /** Whether mouse wheel zooms/pans (default: true). */
    interactive?: boolean;
    /** Padding in px added around the diagram when calling fitToContent() (default: 40). */
    fitPadding?: number;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.001;

// ============================================================================
// Helpers
// ============================================================================

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

function isValidComponent(item: unknown): boolean {
    if (item === null || typeof item !== 'object') return false;
    const c = item as Record<string, unknown>;
    return typeof c.type === 'string' && typeof c.id === 'string' &&
        typeof c.x === 'number' && typeof c.y === 'number';
}

function validateDiagram(data: unknown): SerializedDiagram | null {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.components)) return null;
    for (const item of d.components) {
        if (!isValidComponent(item)) return null;
    }
    if (d.connections !== undefined && !Array.isArray(d.connections)) return null;
    return sanitize(data as SerializedDiagram);
}

function getSortedElements(elements: DiagramElement[]): DiagramElement[] {
    const systems: DiagramElement[] = [];
    const domains: DiagramElement[] = [];
    const modules: DiagramElement[] = [];
    const others: DiagramElement[] = [];
    const boundaries: DiagramElement[] = [];
    const topmost: DiagramElement[] = [];

    for (const el of elements) {
        if (el instanceof NumberedDot || el instanceof Tag || el instanceof Port) {
            topmost.push(el);
        } else if (el instanceof Boundary) {
            boundaries.push(el);
        } else if (el instanceof System) {
            systems.push(el);
        } else if (el instanceof Domain) {
            domains.push(el);
        } else if (el instanceof Module) {
            modules.push(el);
        } else {
            others.push(el);
        }
    }

    return [...systems, ...domains, ...modules, ...others, ...boundaries, ...topmost];
}

// ============================================================================
// ArchieViewer
// ============================================================================

export class ArchieViewer {
    private readonly canvas: HTMLCanvasElement;
    private readonly renderer: CanvasRenderer;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly options: Required<ViewerOptions>;

    private elements: DiagramElement[] = [];
    private connections: Connection[] = [];

    private scale: number;
    private panOffset: { x: number; y: number };

    private isPanning = false;
    private panStart = { x: 0, y: 0 };

    private readonly abortController = new AbortController();
    private readonly resizeObserver: ResizeObserver;

    constructor(canvasIdOrEl: string | HTMLCanvasElement, options: ViewerOptions = {}) {
        const canvas = typeof canvasIdOrEl === 'string' ? document.getElementById(canvasIdOrEl) as HTMLCanvasElement : null;
        if (!canvas) throw new Error(`Canvas element "${canvasIdOrEl}" not found`);

        this.canvas = canvas;
        this.renderer = new CanvasRenderer(canvas);
        this.ctx = this.renderer.ctx;

        this.options = {
            scale: options.scale ?? 1,
            panX: options.panX ?? 0,
            panY: options.panY ?? 0,
            restoreViewport: options.restoreViewport !== false,
            interactive: options.interactive !== false,
            fitPadding: options.fitPadding ?? 40,
        };

        this.scale = this.options.scale;
        this.panOffset = { x: this.options.panX, y: this.options.panY };

        this.resizeObserver = new ResizeObserver(() => {
            this.syncCanvasSize();
            this.render();
        });
        this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);

        if (this.options.interactive) {
            this.attachEvents();
        }

        this.syncCanvasSize();
        this.render();
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Load and display a diagram from a SerializedDiagram object (Archie JSON).
     */
    load(diagram: SerializedDiagram): void {
        const data = validateDiagram(diagram);
        if (!data) {
            console.warn('[ArchieViewer] Invalid diagram data — skipping load');
            return;
        }

        this.elements = [];
        this.connections = [];

        for (const item of data.components) {
            this.elements.push(elementRegistry.createInstance(item.type, item));
        }

        if (data.connections) {
            const componentIds = new Set(this.elements.map(e => e.id));
            for (const connData of data.connections) {
                if (
                    componentIds.has(connData.sourcePoint.componentId) &&
                    componentIds.has(connData.targetPoint.componentId)
                ) {
                    this.connections.push(new Connection(connData as any));
                }
            }
        }

        for (const el of this.elements) {
            if (el instanceof Module || el instanceof Domain || el instanceof System) {
                el.restoreChildren(this.elements);
            }
        }

        if (this.options.restoreViewport && data.viewport) {
            this.scale = data.viewport.scale;
            this.panOffset.x = data.viewport.panX;
            this.panOffset.y = data.viewport.panY;
        }

        this.render();
    }

    /**
     * Zoom and pan so all elements fit within the canvas.
     */
    fitToContent(): void {
        if (this.elements.length === 0) return;

        const pad = this.options.fitPadding;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const el of this.elements) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
        }

        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const canvasW = this.canvas.clientWidth;
        const canvasH = this.canvas.clientHeight;

        this.scale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, Math.min(
                (canvasW - pad * 2) / contentW,
                (canvasH - pad * 2) / contentH
            ))
        );

        this.panOffset.x = pad - minX * this.scale + (canvasW - pad * 2 - contentW * this.scale) / 2;
        this.panOffset.y = pad - minY * this.scale + (canvasH - pad * 2 - contentH * this.scale) / 2;

        this.render();
    }

    /**
     * Force a re-render (e.g. after the container resizes).
     */
    render(): void {
        this.renderer.clear();

        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.scale, this.scale);

        for (const el of getSortedElements(this.elements)) {
            el.draw(this.ctx);
        }

        for (const conn of this.connections) {
            conn.draw(this.ctx, this.elements);
        }

        this.ctx.restore();

        this.drawZoomIndicator();
    }

    /**
     * Remove all event listeners and observers. Call when removing the viewer from the DOM.
     */
    destroy(): void {
        this.abortController.abort();
        this.resizeObserver.disconnect();
    }

    // =========================================================================
    // Private — canvas sizing
    // =========================================================================

    private syncCanvasSize(): void {
        const parent = this.canvas.parentElement;
        const w = parent ? parent.clientWidth : this.canvas.clientWidth;
        const h = parent ? parent.clientHeight : this.canvas.clientHeight;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.scale(dpr, dpr);
    }

    // =========================================================================
    // Private — event handling
    // =========================================================================

    private attachEvents(): void {
        const signal = this.abortController.signal;

        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false, signal });
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e), { signal });
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e), { signal });
        this.canvas.addEventListener('mouseup', () => this.onMouseUp(), { signal });
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp(), { signal });
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();

        if (e.ctrlKey) {
            // Zoom centered on cursor
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldBefore = {
                x: (mouseX - this.panOffset.x) / this.scale,
                y: (mouseY - this.panOffset.y) / this.scale,
            };

            const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
            this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * (1 + zoomDelta)));

            this.panOffset.x = mouseX - worldBefore.x * this.scale;
            this.panOffset.y = mouseY - worldBefore.y * this.scale;
        } else {
            this.panOffset.x -= e.deltaX;
            this.panOffset.y -= e.deltaY;
        }

        this.render();
    }

    private onMouseDown(e: MouseEvent): void {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.isPanning = true;
            this.panStart.x = e.clientX - this.panOffset.x;
            this.panStart.y = e.clientY - this.panOffset.y;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.isPanning) return;
        this.panOffset.x = e.clientX - this.panStart.x;
        this.panOffset.y = e.clientY - this.panStart.y;
        this.render();
    }

    private onMouseUp(): void {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
    }

    // =========================================================================
    // Private — overlay
    // =========================================================================

    private drawZoomIndicator(): void {
        const zoomPercent = Math.round(this.scale * 100);
        const text = `${zoomPercent}%`;
        const padding = 10;

        this.ctx.save();
        this.ctx.font = '12px "Segoe UI", sans-serif';
        this.ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(text, this.canvas.clientWidth - padding, this.canvas.clientHeight - padding);
        this.ctx.restore();
    }
}
