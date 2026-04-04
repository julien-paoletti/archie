/**
 * Label
 * A simple text label without background for annotations
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
export interface LabelOptions extends DiagramElementOptions {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
    fontWeight?: string;
}
export declare class Label extends DiagramElement {
    text: string;
    fontSize: number;
    fontFamily: string;
    textColor: string;
    fontWeight: string;
    hideText: boolean;
    constructor(options?: LabelOptions);
    draw(ctx: CanvasRenderingContext2D): void;
    /**
     * Labels don't have border points for connections
     */
    getNearestBorderPoint(_px: number, _py: number): null;
    clone(): Label;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Label;
}
