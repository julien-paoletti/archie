/**
 * Note
 * A multi-line note element for annotations
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions, ResizeHandle } from './types';
export interface NoteOptions extends DiagramElementOptions {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
    backgroundColor?: string;
    accentColor?: string;
    borderColor?: string;
    noteBorderColor?: string;
    padding?: number;
    lineHeight?: number;
}
export declare class Note extends DiagramElement {
    text: string;
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    accentColor: string;
    borderColor: string;
    padding: number;
    lineHeight: number;
    hideText: boolean;
    constructor(options?: NoteOptions);
    /** Line height in pixels */
    get lineHeightPx(): number;
    /**
     * Snap height to fit exact lines of text (padding + N * lineHeightPx + padding)
     */
    private snapHeightToLines;
    resize(handle: ResizeHandle, dx: number, dy: number): void;
    /**
     * Wrap text to fit within the element width.
     * Returns lines with metadata indicating if each line is the last of its paragraph.
     */
    private wrapText;
    /**
     * Draw a line of text with justified spacing
     */
    private drawJustifiedLine;
    draw(ctx: CanvasRenderingContext2D): void;
    /**
     * Get nearest border point for connections (not typically used for notes, but required by base class)
     */
    getNearestBorderPoint(px: number, py: number): {
        point: {
            x: number;
            y: number;
        };
        side: 'top' | 'right' | 'bottom' | 'left';
        offset: number;
    } | null;
    clone(): Note;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Note;
}
