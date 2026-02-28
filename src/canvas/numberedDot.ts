/**
 * NumberedDot
 * A numbered marker dot for annotations
 */

import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
import { CONNECTION_POINT_HITBOX, CONNECTION_POINT_INSIDE_MARGIN } from './constants';

export interface NumberedDotOptions extends DiagramElementOptions {
    number?: number;
    dotColor?: string;
    numberColor?: string;
    dotSize?: number;
}

export class NumberedDot extends DiagramElement {
    public number: number;
    public dotColor: string;
    public numberColor: string;
    public dotSize: number;

    constructor(options: NumberedDotOptions = {}) {
        super(options);
        this.number = options.number ?? 1;
        this.dotColor = options.dotColor ?? '#3B82F6';
        this.numberColor = options.numberColor ?? '#FFFFFF';
        this.dotSize = options.dotSize ?? 32;

        // Set fixed size for numbered dots
        this.width = this.dotSize;
        this.height = this.dotSize;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = this.dotSize / 2;

        // Draw shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Draw circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.dotColor;
        ctx.fill();

        // Reset shadow for border and text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw border when selected or hovered
        if (this.selected) {
            ctx.strokeStyle = '#1E40AF';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (this.hovered) {
            ctx.strokeStyle = '#60A5FA';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw number
        ctx.fillStyle = this.numberColor;
        ctx.font = `bold ${Math.round(this.dotSize * 0.5)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.number.toString(), centerX, centerY);

        ctx.restore();
    }

    /**
     * Override containsPoint to use circular hit detection
     */
    override containsPoint(px: number, py: number): boolean {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = this.dotSize / 2;
        const dx = px - centerX;
        const dy = py - centerY;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    /**
     * Numbered dots don't have resize handles
     */
    override getResizeHandleAtPoint(_px: number, _py: number): null {
        return null;
    }

    /**
     * Override resize to do nothing (dots are fixed size)
     */
    override resize(): void {
        // Numbered dots cannot be resized
    }

    /**
     * Get nearest border point for connections (on the circle edge)
     */
    getNearestBorderPoint(px: number, py: number, threshold: number = CONNECTION_POINT_HITBOX): { point: { x: number; y: number }; side: 'top' | 'right' | 'bottom' | 'left'; offset: number } | null {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = this.dotSize / 2;

        // Calculate distance from point to center
        const dx = px - centerX;
        const dy = py - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if the point is near the circle (within threshold outside or inside margin inside)
        const maxDistance = radius + threshold;
        const minDistance = radius - CONNECTION_POINT_INSIDE_MARGIN;

        if (distance > maxDistance || distance < minDistance) {
            return null; // Point is not near the border
        }

        // Calculate angle from center to point
        const angle = Math.atan2(dy, dx);

        // Point on circle edge
        const edgeX = centerX + radius * Math.cos(angle);
        const edgeY = centerY + radius * Math.sin(angle);

        // Determine which side (for connection logic)
        let side: 'top' | 'right' | 'bottom' | 'left';
        if (Math.abs(dx) > Math.abs(dy)) {
            side = dx > 0 ? 'right' : 'left';
        } else {
            side = dy > 0 ? 'bottom' : 'top';
        }

        return {
            point: { x: edgeX, y: edgeY },
            side: side,
            offset: 0.5
        };
    }

    clone(): NumberedDot {
        return new NumberedDot({
            x: this.x,
            y: this.y,
            number: this.number,
            dotColor: this.dotColor,
            numberColor: this.numberColor,
            dotSize: this.dotSize
        });
    }

    static override get type(): string {
        return 'numbered-dot';
    }

    static override get displayName(): string {
        return 'Numbered Dot';
    }

    static override createDefault(): NumberedDot {
        return new NumberedDot({
            number: 1,
            dotSize: 32
        });
    }
}
