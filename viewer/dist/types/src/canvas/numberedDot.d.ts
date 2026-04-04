/**
 * NumberedDot
 * A numbered marker dot for annotations
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
export interface NumberedDotOptions extends DiagramElementOptions {
    number?: number;
    dotColor?: string;
    numberColor?: string;
    dotSize?: number;
}
export declare class NumberedDot extends DiagramElement {
    number: number;
    dotColor: string;
    numberColor: string;
    dotSize: number;
    constructor(options?: NumberedDotOptions);
    draw(ctx: CanvasRenderingContext2D): void;
    /**
     * Override containsPoint to use circular hit detection
     */
    containsPoint(px: number, py: number): boolean;
    /**
     * Numbered dots don't have resize handles
     */
    getResizeHandleAtPoint(_px: number, _py: number): null;
    /**
     * Override resize to do nothing (dots are fixed size)
     */
    resize(): void;
    /**
     * Get nearest border point for connections (on the circle edge)
     */
    getNearestBorderPoint(px: number, py: number, threshold?: number): {
        point: {
            x: number;
            y: number;
        };
        side: 'top' | 'right' | 'bottom' | 'left';
        offset: number;
    } | null;
    clone(): NumberedDot;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): NumberedDot;
}
