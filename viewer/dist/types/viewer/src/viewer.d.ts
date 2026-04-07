import type { SerializedDiagram } from '../../src/editor/editorTypes';
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
export declare class ArchieViewer {
    private readonly canvas;
    private readonly renderer;
    private readonly ctx;
    private readonly options;
    private elements;
    private connections;
    private scale;
    private panOffset;
    private isPanning;
    private panStart;
    private readonly abortController;
    private readonly resizeObserver;
    constructor(canvasIdOrEl: string | HTMLCanvasElement, options?: ViewerOptions);
    /**
     * Load and display a diagram from a SerializedDiagram object (Archie JSON).
     */
    load(diagram: SerializedDiagram): void;
    /**
     * Zoom and pan so all elements fit within the canvas.
     */
    fitToContent(): void;
    /**
     * Force a re-render (e.g. after the container resizes).
     */
    render(): void;
    /**
     * Remove all event listeners and observers. Call when removing the viewer from the DOM.
     */
    destroy(): void;
    private syncCanvasSize;
    private attachEvents;
    private onWheel;
    private onMouseDown;
    private onMouseMove;
    private onMouseUp;
    private drawZoomIndicator;
}
