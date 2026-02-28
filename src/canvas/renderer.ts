/**
 * Canvas Renderer
 * Handles canvas setup, scaling, and clearing
 */

export class CanvasRenderer {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    private dpr: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = context;
        this.dpr = window.devicePixelRatio || 1;
        this.setupCanvas();
    }

    setupCanvas(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    clear(): void {
        // Use CSS dimensions since context is scaled by DPR
        this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    }

    resize(): void {
        this.setupCanvas();
    }
}
