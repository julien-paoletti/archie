/**
 * Shape Drawer
 * Utility class for drawing shapes on canvas
 */
import type { ColorStop, ShadowOptions, TextOptions } from './types';
export declare class ShapeDrawer {
    private ctx;
    constructor(ctx: CanvasRenderingContext2D);
    /**
     * Draw a rounded rectangle path
     */
    roundedRect(x: number, y: number, width: number, height: number, radius: number): void;
    /**
     * Create a linear gradient
     */
    createLinearGradient(x1: number, y1: number, x2: number, y2: number, colorStops: ColorStop[]): CanvasGradient;
    /**
     * Apply shadow settings
     */
    applyShadow(options?: ShadowOptions): void;
    /**
     * Clear shadow settings
     */
    clearShadow(): void;
    /**
     * Draw text with options
     */
    drawText(text: string, x: number, y: number, options?: TextOptions): void;
}
