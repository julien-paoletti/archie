/**
 * Tag Element
 * A small badge/tag that can be placed freely anywhere on the canvas
 * Does not snap to grid, has no connection points, and cannot be resized
 */

import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
import { TAG_COLORS } from './constants';

export interface TagOptions extends DiagramElementOptions {
    text?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
}

export class Tag extends DiagramElement {
    public text: string;
    public backgroundColor: string;
    public textColor: string;
    public fontSize: number;

    private static colorIndex = 0;

    constructor(options: TagOptions = {}) {
        super(options);
        this.text = options.text ?? options.title ?? 'Tag';
        this.backgroundColor = options.backgroundColor ?? '#DBEAFE';
        this.textColor = options.textColor ?? '#1E40AF';
        this.fontSize = options.fontSize ?? 11;
        this.title = this.text;

        // Auto-size to fit text if no explicit size
        if (!options.width) {
            this.width = this.calculateWidth();
        }
        if (!options.height) {
            this.height = 24;
        }
    }

    private calculateWidth(): number {
        const charWidth = this.fontSize * 0.62;
        return Math.max(40, this.text.length * charWidth + 20);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        const radius = this.height / 2;

        // Draw pill shape
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        ctx.lineTo(this.x + this.width - radius, this.y);
        ctx.arc(this.x + this.width - radius, this.y + radius, radius, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(this.x + radius, this.y + this.height);
        ctx.arc(this.x + radius, this.y + radius, radius, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();

        ctx.fillStyle = this.backgroundColor;
        ctx.fill();

        // Border
        if (this.selected) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
        } else if (this.hovered) {
            ctx.strokeStyle = '#93C5FD';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = this.textColor;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw text
        if (!this.hideTitle) {
            ctx.fillStyle = this.textColor;
            ctx.font = `600 ${this.fontSize}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2, this.width - 12);
        }

        ctx.restore();
    }

    /** Tags don't have resize handles */
    override getResizeHandleAtPoint(): null {
        return null;
    }

    /** Tags cannot be resized */
    override resize(): void {}

    /** Tags don't have connection points */
    getNearestBorderPoint(): null {
        return null;
    }

    clone(): Tag {
        return new Tag({
            x: this.x,
            y: this.y,
            text: this.text,
            backgroundColor: this.backgroundColor,
            textColor: this.textColor,
            fontSize: this.fontSize
        });
    }

    static override get type(): string {
        return 'tag';
    }

    static override get displayName(): string {
        return 'Tag';
    }

    static override createDefault(): Tag {
        const color = TAG_COLORS[Tag.colorIndex % TAG_COLORS.length]!;
        Tag.colorIndex++;
        return new Tag({
            text: 'Tag',
            backgroundColor: color.bg,
            textColor: color.text
        });
    }
}
