/**
 * Canvas Renderer
 * Handles canvas setup, scaling, and clearing
 */
export declare class CanvasRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private dpr;
    constructor(canvas: HTMLCanvasElement);
    setupCanvas(): void;
    clear(): void;
    resize(): void;
}
