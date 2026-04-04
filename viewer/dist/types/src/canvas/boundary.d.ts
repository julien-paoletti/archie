/**
 * Boundary Class
 * A simple rounded rectangle to delimit zones in diagrams
 */
import { DiagramElement } from './diagramElement';
import type { BoundaryOptions, LabelPosition } from './types';
export declare class Boundary extends DiagramElement {
    borderRadius: number;
    borderColor: string;
    borderWidth: number;
    labelColor: string;
    labelFont: string;
    backgroundColor: string;
    labelPosition: LabelPosition;
    constructor(options?: BoundaryOptions);
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    /**
     * Boundaries have no connection points — they are purely visual annotations.
     */
    getNearestBorderPoint(): null;
    /**
     * Override containsPoint to only detect clicks on the border, not the interior.
     * This allows clicking on elements that are visually inside the boundary.
     */
    containsPoint(px: number, py: number): boolean;
    clone(): Boundary;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Boundary;
}
