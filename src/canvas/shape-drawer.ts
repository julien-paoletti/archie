/**
 * Shape Drawer
 * Utility class for drawing shapes on canvas
 */

import type { ColorStop, ShadowOptions, TextOptions } from './types';

export class ShapeDrawer {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    /**
     * Draw a rounded rectangle path
     */
    roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Create a linear gradient
     */
    createLinearGradient(x1: number, y1: number, x2: number, y2: number, colorStops: ColorStop[]): CanvasGradient {
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        return gradient;
    }

    /**
     * Apply shadow settings
     */
    applyShadow(options: ShadowOptions = {}): void {
        const {
            color = 'rgba(0, 0, 0, 0.3)',
            blur = 15,
            offsetX = 0,
            offsetY = 5
        } = options;

        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
        this.ctx.shadowOffsetX = offsetX;
        this.ctx.shadowOffsetY = offsetY;
    }

    /**
     * Clear shadow settings
     */
    clearShadow(): void {
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    /**
     * Draw text with options
     */
    drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
        const {
            font = '14px "Segoe UI", sans-serif',
            color = '#ffffff',
            align = 'center',
            baseline = 'middle',
            maxWidth = undefined
        } = options;

        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        if (maxWidth !== undefined) {
            this.ctx.fillText(text, x, y, maxWidth);
        } else {
            this.ctx.fillText(text, x, y);
        }
    }
}
