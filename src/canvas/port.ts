/**
 * Port Element
 * A small interface/port marker that can be placed on element borders.
 * Displays an optional port number and a name label.
 */

import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
import { CONNECTION_POINT_HITBOX, CONNECTION_POINT_INSIDE_MARGIN } from './constants';

export const PORT_SIZE = 22;
export const PORT_SNAP_THRESHOLD = 20;

export interface PortOptions extends DiagramElementOptions {
    portNumber?: number | null;
    portColor?: string;
    snappedToId?: string | null;
    snappedSide?: 'top' | 'right' | 'bottom' | 'left' | null;
    snappedOffset?: number | null;
}

export class Port extends DiagramElement {
    public portNumber: number | null;
    public portColor: string;
    public snappedToId: string | null;
    public snappedSide: 'top' | 'right' | 'bottom' | 'left' | null;
    public snappedOffset: number | null;

    constructor(options: PortOptions = {}) {
        super(options);
        this.portNumber = options.portNumber ?? null;
        this.portColor = options.portColor ?? '#475569';
        this.snappedToId = options.snappedToId ?? null;
        this.snappedSide = options.snappedSide ?? null;
        this.snappedOffset = options.snappedOffset ?? null;

        this.width = PORT_SIZE;
        this.height = PORT_SIZE;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        const { x, y } = this;
        const s = PORT_SIZE;

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        // Box fill
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, s, s);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Box border
        if (this.hovered && !this.selected) {
            ctx.strokeStyle = '#60A5FA';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = this.portColor;
            ctx.lineWidth = 1.5;
        }
        ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5);

        // Selection dashed outline
        if (this.selected) {
            ctx.strokeStyle = '#60A5FA';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x - 3, y - 3, s + 6, s + 6);
            ctx.setLineDash([]);
        }

        const isVertical = this.snappedSide === 'left' || this.snappedSide === 'right';
        const gap = 4;
        const badgeH = 12;
        const padH = 4;
        const r = badgeH / 2;

        const drawBadge = (label: string, font: string, bx: number, by: number): void => {
            ctx.font = font;
            const badgeW = Math.max(badgeH, ctx.measureText(label).width + padH * 2);

            ctx.beginPath();
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + badgeW - r, by);
            ctx.arcTo(bx + badgeW, by, bx + badgeW, by + badgeH, r);
            ctx.lineTo(bx + badgeW, by + badgeH - r);
            ctx.arcTo(bx + badgeW, by + badgeH, bx + badgeW - r, by + badgeH, r);
            ctx.lineTo(bx + r, by + badgeH);
            ctx.arcTo(bx, by + badgeH, bx, by + badgeH - r, r);
            ctx.lineTo(bx, by + r);
            ctx.arcTo(bx, by, bx + r, by, r);
            ctx.closePath();
            ctx.fillStyle = this.portColor;
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, bx + badgeW / 2, by + badgeH / 2 + 0.5);
        };

        const badgeWidth = (label: string, font: string): number => {
            ctx.font = font;
            return Math.max(badgeH, ctx.measureText(label).width + padH * 2);
        };

        if (this.portNumber !== null) {
            const label = String(this.portNumber);
            const font = `bold 9px "Segoe UI", sans-serif`;
            const bw = badgeWidth(label, font);
            const bx = isVertical ? x + s / 2 - bw / 2 : x - bw - gap;
            const by = isVertical ? y - badgeH - gap : y + s / 2 - badgeH / 2;
            drawBadge(label, font, bx, by);
        }

        if (!this.hideTitle && this.title) {
            const font = `500 9px "Segoe UI", sans-serif`;
            const bw = badgeWidth(this.title, font);
            const bx = isVertical ? x + s / 2 - bw / 2 : x + s + gap;
            const by = isVertical ? y + s + gap : y + s / 2 - badgeH / 2;
            drawBadge(this.title, font, bx, by);
        }

        ctx.restore();
    }

    override containsPoint(px: number, py: number): boolean {
        return px >= this.x && px <= this.x + PORT_SIZE && py >= this.y && py <= this.y + PORT_SIZE;
    }

    override getResizeHandleAtPoint(): null {
        return null;
    }

    override resize(): void {}

    getNearestBorderPoint(px: number, py: number, threshold: number = CONNECTION_POINT_HITBOX): { point: { x: number; y: number }; side: 'top' | 'right' | 'bottom' | 'left'; offset: number } | null {
        const { x, y } = this;
        const s = PORT_SIZE;
        const inner = CONNECTION_POINT_INSIDE_MARGIN;

        const nearLeft   = Math.abs(px - x) <= threshold          && py >= y - threshold         && py <= y + s + threshold;
        const nearRight  = Math.abs(px - (x + s)) <= threshold    && py >= y - threshold         && py <= y + s + threshold;
        const nearTop    = Math.abs(py - y) <= threshold          && px >= x - threshold         && px <= x + s + threshold;
        const nearBottom = Math.abs(py - (y + s)) <= threshold    && px >= x - threshold         && px <= x + s + threshold;

        const inside = px >= x - inner && px <= x + s + inner && py >= y - inner && py <= y + s + inner;
        if (!inside && !nearLeft && !nearRight && !nearTop && !nearBottom) return null;

        const distLeft   = Math.abs(px - x);
        const distRight  = Math.abs(px - (x + s));
        const distTop    = Math.abs(py - y);
        const distBottom = Math.abs(py - (y + s));
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist === distLeft)   return { point: { x,     y: y + s / 2 }, side: 'left',   offset: 0.5 };
        if (minDist === distRight)  return { point: { x: x + s, y: y + s / 2 }, side: 'right',  offset: 0.5 };
        if (minDist === distTop)    return { point: { x: x + s / 2, y },     side: 'top',    offset: 0.5 };
        return { point: { x: x + s / 2, y: y + s }, side: 'bottom', offset: 0.5 };
    }

    clone(): Port {
        return new Port({
            x: this.x,
            y: this.y,
            title: this.title,
            portNumber: this.portNumber,
            portColor: this.portColor,
            snappedToId: this.snappedToId,
            snappedSide: this.snappedSide,
            snappedOffset: this.snappedOffset,
        });
    }

    static override get type(): string {
        return 'port';
    }

    static override get displayName(): string {
        return 'Port';
    }

    static override createDefault(): Port {
        return new Port({ title: '' });
    }
}
