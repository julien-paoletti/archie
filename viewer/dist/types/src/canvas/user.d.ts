/**
 * User Element
 * Represents human stakeholders in architecture diagrams
 * Uses circular shape to distinguish from other rectangular elements
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions, ColorStop, ShadowOptions, Point, ResizeHandle } from './types';
export interface UserOptions extends DiagramElementOptions {
    gradientColors?: ColorStop[];
    shadowOptions?: ShadowOptions;
    borderColor?: string;
    borderWidth?: number;
    titleColor?: string;
    titleFont?: string;
    iconColor?: string;
}
export declare class User extends DiagramElement {
    gradientColors: ColorStop[];
    shadowOptions: ShadowOptions;
    borderColor: string;
    borderWidth: number;
    titleColor: string;
    titleFont: string;
    iconColor: string;
    private iconLoaded;
    constructor(options?: UserOptions);
    private loadIcon;
    /**
     * Get the center point of the circle
     */
    getCenter(): Point;
    /**
     * Get the radius of the circle
     */
    getRadius(): number;
    /**
     * Override containsPoint for circular hit detection
     * Also includes the title area below the circle
     */
    containsPoint(px: number, py: number): boolean;
    /**
     * Override to maintain circular shape during resize
     */
    resize(handle: ResizeHandle, dx: number, dy: number, minWidth?: number, minHeight?: number): void;
    /**
     * Override getNearestBorderPoint for circular border
     */
    getNearestBorderPoint(px: number, py: number, threshold?: number): {
        point: Point;
        side: 'top' | 'right' | 'bottom' | 'left';
        offset: number;
    } | null;
    /**
     * Override getPointOnBorder for circular shape.
     * offset encodes the full-circle angle as (angle + PI) / (2 * PI),
     * so we decode it directly and ignore side.
     */
    getPointOnBorder(_side: 'top' | 'right' | 'bottom' | 'left', offset: number): Point;
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    getResizeHandleAtPoint(_px: number, _py: number): ResizeHandle;
    clone(): User;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): User;
}
