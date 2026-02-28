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

export class Label extends DiagramElement {
    public text: string;
    public fontSize: number;
    public fontFamily: string;
    public textColor: string;
    public fontWeight: string;
    public hideText: boolean = false;

    constructor(options: LabelOptions = {}) {
        super(options);
        this.text = options.text ?? 'Label';
        this.fontSize = options.fontSize ?? 14;
        this.fontFamily = options.fontFamily ?? '"Segoe UI", sans-serif';
        this.textColor = options.textColor ?? '#374151';
        this.fontWeight = options.fontWeight ?? '400';

        // Auto-size based on text if no explicit size
        if (!options.width) this.width = 120;
        if (!options.height) this.height = 28;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        // Draw selection/hover indicator (subtle underline)
        if (this.selected || this.hovered) {
            ctx.strokeStyle = this.selected ? '#3B82F6' : '#93C5FD';
            ctx.lineWidth = this.selected ? 2 : 1;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.setLineDash([]);
        }

        // Draw text if not hidden
        if (!this.hideText) {
            ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
            ctx.fillStyle = this.textColor;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2, this.width - 8);
        }

        ctx.restore();

        // Draw resize handles when selected
        this.drawResizeHandles(ctx);
    }

    /**
     * Labels don't have border points for connections
     */
    override getNearestBorderPoint(_px: number, _py: number): null {
        return null;
    }

    clone(): Label {
        return new Label({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            fontWeight: this.fontWeight
        });
    }

    static override get type(): string {
        return 'label';
    }

    static override get displayName(): string {
        return 'Label';
    }

    static override createDefault(): Label {
        return new Label({
            text: 'Label',
            width: 60,
            height: 28
        });
    }
}
