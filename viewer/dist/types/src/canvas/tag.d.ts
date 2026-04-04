/**
 * Tag Element
 * A small badge/tag that can be placed freely anywhere on the canvas
 * Does not snap to grid, has no connection points, and cannot be resized
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
export interface TagOptions extends DiagramElementOptions {
    text?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
}
export declare class Tag extends DiagramElement {
    text: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    private static colorIndex;
    constructor(options?: TagOptions);
    private calculateWidth;
    draw(ctx: CanvasRenderingContext2D): void;
    /** Tags don't have resize handles */
    getResizeHandleAtPoint(): null;
    /** Tags cannot be resized */
    resize(): void;
    /** Tags don't have connection points */
    getNearestBorderPoint(): null;
    clone(): Tag;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Tag;
}
