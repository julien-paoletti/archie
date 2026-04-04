/**
 * Base Diagram Element
 * Abstract base class for all diagram elements
 */
import type { Point, ResizeHandle, DiagramElementOptions } from './types';
export declare abstract class DiagramElement {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    selected: boolean;
    hovered: boolean;
    hideTitle: boolean;
    parentId: string | null;
    constructor(options?: DiagramElementOptions);
    private generateId;
    containsPoint(px: number, py: number): boolean;
    getResizeHandleAtPoint(px: number, py: number): ResizeHandle;
    private isNearPoint;
    resize(handle: ResizeHandle, dx: number, dy: number, minWidth?: number, minHeight?: number): void;
    moveTo(x: number, y: number): void;
    moveBy(dx: number, dy: number): void;
    /**
     * Get a point on the border given a side and offset (0-1)
     */
    getPointOnBorder(side: 'top' | 'right' | 'bottom' | 'left', offset: number): Point;
    /**
     * Get the nearest point on the component's border to a given point
     * Returns null if the point is not near the border.
     * Detection is limited inside the element to avoid conflicting with drag operations.
     */
    getNearestBorderPoint(px: number, py: number, threshold?: number): {
        point: Point;
        side: 'top' | 'right' | 'bottom' | 'left';
        offset: number;
    } | null;
    abstract draw(ctx: CanvasRenderingContext2D, scale?: number): void;
    drawResizeHandles(ctx: CanvasRenderingContext2D): void;
    abstract clone(): DiagramElement;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): DiagramElement;
}
