/**
 * Boundary Class
 * A simple rounded rectangle to delimit zones in diagrams
 */

import { DiagramElement } from './diagramElement';
import type { BoundaryOptions, LabelPosition } from './types';

export class Boundary extends DiagramElement {
    public borderRadius: number;
    public borderColor: string;
    public borderWidth: number;
    public labelColor: string;
    public labelFont: string;
    public backgroundColor: string;
    public labelPosition: LabelPosition;

    constructor(options: BoundaryOptions = {}) {
        super(options);
        this.borderRadius = options.borderRadius ?? 8;
        this.borderColor = options.borderColor ?? '#94A3B8';  // Slate-400
        this.borderWidth = options.borderWidth ?? 2;
        this.labelColor = options.labelColor ?? '#64748B';  // Slate-500
        this.labelFont = options.labelFont ?? '12px "Segoe UI", sans-serif';
        this.backgroundColor = options.backgroundColor ?? 'rgba(248, 250, 252, 0.5)';  // Slate-50 with transparency
        this.labelPosition = options.labelPosition ?? 'top-left';

        this.title = options.title ?? "boundary";
    }

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        const radius = this.borderRadius;

        ctx.save();

        // Draw dashed border
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.strokeStyle = this.selected ? '#60a5fa' : this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw selection indicator
        if (this.selected) {
            ctx.beginPath();
            ctx.roundRect(x - 3, y - 3, width + 6, height + 6, radius + 3);
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw hover effect
        if (this.hovered && !this.selected) {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, radius);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();
        }

        // Draw label if present
        if (this.title && !this.hideTitle) {
            const padding = 8;
            const labelPadding = 4;

            ctx.font = this.labelFont;
            const metrics = ctx.measureText(this.title);
            const textWidth = metrics.width;
            const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            const boxWidth = textWidth + labelPadding * 2;
            const boxHeight = textHeight + labelPadding * 2;

            // Calculate label position based on labelPosition
            let labelX: number;
            let labelY: number;
            if (this.labelPosition === 'top-right') {
                labelX = x + width - padding - textWidth;
                labelY = y + padding;
            } else if (this.labelPosition === 'bottom-left') {
                labelX = x + padding;
                labelY = y + height - padding - textHeight;
            } else if (this.labelPosition === 'bottom-right') {
                labelX = x + width - padding - textWidth;
                labelY = y + height - padding - textHeight;
            } else {
                // top-left (default)
                labelX = x + padding;
                labelY = y + padding;
            }

            // Draw label background
            ctx.beginPath();
            ctx.roundRect(
                labelX - labelPadding,
                labelY - labelPadding,
                boxWidth,
                boxHeight,
                4
            );
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.stroke();

            // Draw label text
            ctx.fillStyle = this.labelColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(this.title, labelX, labelY);
        }

        ctx.restore();

        // Draw resize handles when selected
        this.drawResizeHandles(ctx);
    }

    /**
     * Boundaries have no connection points — they are purely visual annotations.
     */
    override getNearestBorderPoint(): null {
        return null;
    }

    /**
     * Override containsPoint to only detect clicks on the border, not the interior.
     * This allows clicking on elements that are visually inside the boundary.
     */
    override containsPoint(px: number, py: number): boolean {
        const borderThreshold = 10; // Pixels from border to detect click

        // Check if point is within the outer bounds
        const inOuterBounds = px >= this.x - borderThreshold &&
            px <= this.x + this.width + borderThreshold &&
            py >= this.y - borderThreshold &&
            py <= this.y + this.height + borderThreshold;

        if (!inOuterBounds) return false;

        // Check if point is in the interior (not on border)
        const inInterior = px > this.x + borderThreshold &&
            px < this.x + this.width - borderThreshold &&
            py > this.y + borderThreshold &&
            py < this.y + this.height - borderThreshold;

        // If in interior, check if clicking on the label area
        if (inInterior && this.title) {
            const padding = 8;
            const labelPadding = 4;
            const labelWidth = 150; // Approximate max label width
            const labelHeight = 22;
            const boxWidth = labelWidth + labelPadding * 2;
            const boxHeight = labelHeight;

            let labelX: number;
            let labelY: number;
            if (this.labelPosition === 'top-right') {
                labelX = this.x + this.width - padding - labelWidth - labelPadding;
                labelY = this.y + padding - labelPadding;
            } else if (this.labelPosition === 'bottom-left') {
                labelX = this.x + padding - labelPadding;
                labelY = this.y + this.height - padding - labelHeight;
            } else if (this.labelPosition === 'bottom-right') {
                labelX = this.x + this.width - padding - labelWidth - labelPadding;
                labelY = this.y + this.height - padding - labelHeight;
            } else {
                // top-left
                labelX = this.x + padding - labelPadding;
                labelY = this.y + padding - labelPadding;
            }

            const onLabel = px >= labelX &&
                px <= labelX + boxWidth &&
                py >= labelY &&
                py <= labelY + boxHeight;

            if (onLabel) return true;
        }

        // Return true if on border (not in interior)
        return !inInterior;
    }

    clone(): Boundary {
        return new Boundary({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            title: this.title,
            borderRadius: this.borderRadius,
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            labelColor: this.labelColor,
            labelFont: this.labelFont,
            backgroundColor: this.backgroundColor,
            labelPosition: this.labelPosition
        });
    }

    static override get type(): string {
        return 'boundary';
    }

    static override get displayName(): string {
        return 'Boundary';
    }

    static override createDefault(): Boundary {
        return new Boundary({
            title: 'Boundary',
            width: 200,
            height: 150
        });
    }
}
