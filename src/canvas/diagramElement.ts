/**
 * Base Diagram Element
 * Abstract base class for all diagram elements
 */

import type { Point, ResizeHandle, DiagramElementOptions } from './types';
import { HANDLE_SIZE, HANDLE_HITBOX, CONNECTION_POINT_HITBOX, CONNECTION_POINT_INSIDE_MARGIN } from './constants';

export abstract class DiagramElement {
    public id: string;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public title: string;
    public selected: boolean;
    public hovered: boolean;
    public hideTitle: boolean;
    public parentId: string | null;

    constructor(options: DiagramElementOptions = {}) {
        this.id = options.id || this.generateId();
        this.x = options.x ?? 0;
        this.y = options.y ?? 0;
        this.width = options.width ?? 24 * 8;
        this.height = options.height ?? 80;
        this.title = options.title ?? 'Element';
        this.selected = false;
        this.hovered = false;
        this.hideTitle = false;
        this.parentId = options.parentId ?? null;
    }

    private generateId(): string {
        return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    containsPoint(px: number, py: number): boolean {
        return px >= this.x &&
            px <= this.x + this.width &&
            py >= this.y &&
            py <= this.y + this.height;
    }

    getResizeHandleAtPoint(px: number, py: number): ResizeHandle {
        if (!this.selected) return null;

        const hitbox = HANDLE_HITBOX;
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Check corners first (they have priority)
        if (this.isNearPoint(px, py, x, y, hitbox)) return 'top-left';
        if (this.isNearPoint(px, py, x + w, y, hitbox)) return 'top-right';
        if (this.isNearPoint(px, py, x, y + h, hitbox)) return 'bottom-left';
        if (this.isNearPoint(px, py, x + w, y + h, hitbox)) return 'bottom-right';

        // Check edges
        if (this.isNearPoint(px, py, x + w / 2, y, hitbox)) return 'top';
        if (this.isNearPoint(px, py, x + w / 2, y + h, hitbox)) return 'bottom';
        if (this.isNearPoint(px, py, x, y + h / 2, hitbox)) return 'left';
        if (this.isNearPoint(px, py, x + w, y + h / 2, hitbox)) return 'right';

        return null;
    }

    private isNearPoint(px: number, py: number, x: number, y: number, threshold: number): boolean {
        return Math.abs(px - x) <= threshold && Math.abs(py - y) <= threshold;
    }

    resize(handle: ResizeHandle, dx: number, dy: number, minWidth: number = 40, minHeight: number = 40): void {
        if (!handle) return;

        let newX = this.x;
        let newY = this.y;
        let newWidth = this.width;
        let newHeight = this.height;

        // Horizontal resizing
        if (handle.includes('left')) {
            const maxDx = this.width - minWidth;
            const actualDx = Math.min(dx, maxDx);
            newX = this.x + actualDx;
            newWidth = this.width - actualDx;
        } else if (handle.includes('right')) {
            newWidth = Math.max(minWidth, this.width + dx);
        }

        // Vertical resizing
        if (handle.includes('top')) {
            const maxDy = this.height - minHeight;
            const actualDy = Math.min(dy, maxDy);
            newY = this.y + actualDy;
            newHeight = this.height - actualDy;
        } else if (handle.includes('bottom')) {
            newHeight = Math.max(minHeight, this.height + dy);
        }

        this.x = newX;
        this.y = newY;
        this.width = newWidth;
        this.height = newHeight;
    }

    moveTo(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    moveBy(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    /**
     * Get a point on the border given a side and offset (0-1)
     */
    getPointOnBorder(side: 'top' | 'right' | 'bottom' | 'left', offset: number): Point {
        switch (side) {
            case 'top':
                return { x: this.x + this.width * offset, y: this.y };
            case 'bottom':
                return { x: this.x + this.width * offset, y: this.y + this.height };
            case 'left':
                return { x: this.x, y: this.y + this.height * offset };
            case 'right':
                return { x: this.x + this.width, y: this.y + this.height * offset };
        }
    }

    /**
     * Get the nearest point on the component's border to a given point
     * Returns null if the point is not near the border.
     * Detection is limited inside the element to avoid conflicting with drag operations.
     */
    getNearestBorderPoint(px: number, py: number, threshold: number = CONNECTION_POINT_HITBOX): { point: Point; side: 'top' | 'right' | 'bottom' | 'left'; offset: number } | null {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;
        const insideMargin = CONNECTION_POINT_INSIDE_MARGIN;

        // Check each side and find the closest point
        const sides: Array<{ side: 'top' | 'right' | 'bottom' | 'left'; dist: number; point: Point; offset: number }> = [];

        // Top edge - detect outside (up to threshold) and inside (up to insideMargin)
        if (px >= x && px <= x + w) {
            const dist = py - y; // positive = inside, negative = outside
            if (dist >= -threshold && dist <= insideMargin) {
                sides.push({ side: 'top', dist: Math.abs(dist), point: { x: px, y }, offset: (px - x) / w });
            }
        }

        // Bottom edge - detect outside (up to threshold) and inside (up to insideMargin)
        if (px >= x && px <= x + w) {
            const dist = (y + h) - py; // positive = inside, negative = outside
            if (dist >= -threshold && dist <= insideMargin) {
                sides.push({ side: 'bottom', dist: Math.abs(dist), point: { x: px, y: y + h }, offset: (px - x) / w });
            }
        }

        // Left edge - detect outside (up to threshold) and inside (up to insideMargin)
        if (py >= y && py <= y + h) {
            const dist = px - x; // positive = inside, negative = outside
            if (dist >= -threshold && dist <= insideMargin) {
                sides.push({ side: 'left', dist: Math.abs(dist), point: { x, y: py }, offset: (py - y) / h });
            }
        }

        // Right edge - detect outside (up to threshold) and inside (up to insideMargin)
        if (py >= y && py <= y + h) {
            const dist = (x + w) - px; // positive = inside, negative = outside
            if (dist >= -threshold && dist <= insideMargin) {
                sides.push({ side: 'right', dist: Math.abs(dist), point: { x: x + w, y: py }, offset: (py - y) / h });
            }
        }

        if (sides.length === 0) return null;

        // Return the closest side
        sides.sort((a, b) => a.dist - b.dist);
        const closest = sides[0]!;

        // Snap offset to 0.5 (middle of border) when close
        const snapThreshold = 0.08;
        if (Math.abs(closest.offset - 0.5) < snapThreshold) {
            closest.offset = 0.5;
            if (closest.side === 'top' || closest.side === 'bottom') {
                closest.point.x = x + w * 0.5;
            } else {
                closest.point.y = y + h * 0.5;
            }
        }

        return { point: closest.point, side: closest.side, offset: closest.offset };
    }

    abstract draw(ctx: CanvasRenderingContext2D, scale?: number): void;

    drawResizeHandles(ctx: CanvasRenderingContext2D): void {
        if (!this.selected) return;

        const size = HANDLE_SIZE;
        const half = size / 2;
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;

        const handles: Point[] = [
            { x: x, y: y },                    // top-left
            { x: x + w / 2, y: y },            // top
            { x: x + w, y: y },                // top-right
            { x: x, y: y + h / 2 },            // left
            { x: x + w, y: y + h / 2 },        // right
            { x: x, y: y + h },                // bottom-left
            { x: x + w / 2, y: y + h },        // bottom
            { x: x + w, y: y + h }             // bottom-right
        ];

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(handle.x - half, handle.y - half, size, size);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    abstract clone(): DiagramElement;

    static get type(): string {
        throw new Error('Subclass must implement static type getter');
    }

    static get displayName(): string {
        throw new Error('Subclass must implement static displayName getter');
    }

    static createDefault(): DiagramElement {
        throw new Error('Subclass must implement static createDefault method');
    }
}
