/**
 * Note
 * A multi-line note element for annotations
 */

import { DiagramElement } from './diagramElement';
import { iconCache, TABLER_ICONS } from './iconCache';
import type { DiagramElementOptions, LabelPosition, ResizeHandle } from './types';

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
    noteIcon?: string;
    noteIconPosition?: LabelPosition;
}

export class Note extends DiagramElement {
    public text: string;
    public fontSize: number;
    public fontFamily: string;
    public textColor: string;
    public backgroundColor: string;
    public accentColor: string;
    public borderColor: string;
    public padding: number;
    public lineHeight: number;
    public noteIcon: string;
    public noteIconPosition: LabelPosition;
    public hideText: boolean = false;

    constructor(options: NoteOptions = {}) {
        super(options);
        this.text = options.text ?? 'Text';
        this.fontSize = options.fontSize ?? 14;
        this.fontFamily = options.fontFamily ?? '"Segoe UI", sans-serif';
        this.textColor = options.textColor ?? '#5D4E37';
        this.backgroundColor = options.backgroundColor ?? '#FEF9E7';
        this.accentColor = options.accentColor ?? '#F6E05E';
        this.borderColor = options.borderColor ?? options.noteBorderColor ?? '#E8DFC0';
        this.padding = options.padding ?? 8;
        this.lineHeight = options.lineHeight ?? 1.5;
        this.noteIcon = options.noteIcon ?? '';
        this.noteIconPosition = options.noteIconPosition ?? 'top-left';

        // Set default size for note elements
        if (!options.width) this.width = 200;
        if (!options.height) this.height = 100;

        this.ensureIconCached();
    }

    /** Line height in pixels */
    get lineHeightPx(): number {
        return this.fontSize * this.lineHeight;
    }

    /**
     * Snap height to fit exact lines of text (padding + N * lineHeightPx + padding)
     */
    private snapHeightToLines(rawHeight: number): number {
        const contentHeight = rawHeight - this.padding * 2;
        const lines = Math.max(1, Math.round(contentHeight / this.lineHeightPx));
        return this.padding * 2 + lines * this.lineHeightPx;
    }

    override resize(handle: ResizeHandle, dx: number, dy: number): void {
        if (!handle) return;

        const minWidth = 40;
        const minLines = 1;
        const minHeight = this.padding * 2 + minLines * this.lineHeightPx;

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

        // Vertical resizing - snap to line height
        if (handle.includes('top')) {
            const rawHeight = this.height - dy;
            newHeight = this.snapHeightToLines(rawHeight);
            if (newHeight < minHeight) newHeight = minHeight;
            newY = this.y + (this.height - newHeight);
        } else if (handle.includes('bottom')) {
            const rawHeight = this.height + dy;
            newHeight = this.snapHeightToLines(rawHeight);
            if (newHeight < minHeight) newHeight = minHeight;
        }

        this.x = newX;
        this.y = newY;
        this.width = newWidth;
        this.height = newHeight;
    }

    /**
     * Wrap text to fit within the element width.
     * Returns lines with metadata indicating if each line is the last of its paragraph.
     */
    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): { text: string; isLastInParagraph: boolean }[] {
        const lines: { text: string; isLastInParagraph: boolean }[] = [];
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            if (paragraph === '') {
                lines.push({ text: '', isLastInParagraph: true });
                continue;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    lines.push({ text: currentLine, isLastInParagraph: false });
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                lines.push({ text: currentLine, isLastInParagraph: true });
            }
        }

        return lines;
    }

    /**
     * Draw a line of text with justified spacing
     */
    private drawJustifiedLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
        const words = text.split(' ');
        if (words.length <= 1) {
            ctx.fillText(text, x, y);
            return;
        }

        const totalWordWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0);
        const spacing = (maxWidth - totalWordWidth) / (words.length - 1);

        let currentX = x;
        for (const word of words) {
            ctx.fillText(word, currentX, y);
            currentX += ctx.measureText(word).width + spacing;
        }
    }

    private ensureIconCached(): void {
        if (!this.noteIcon) return;
        const svg = TABLER_ICONS[this.noteIcon];
        if (svg && !iconCache.has(this.noteIcon, 16, this.accentColor)) {
            iconCache.loadIcon(this.noteIcon, svg, 16, this.accentColor);
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = this.accentColor;
        ctx.fillRect(this.x, this.y, 4, this.height);

        ctx.strokeStyle = this.selected ? '#3B82F6' : this.hovered ? '#93C5FD' : this.borderColor;
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        const iconSize = 16;
        const isTop = this.noteIconPosition === 'top-left' || this.noteIconPosition === 'top-right';
        const isLeft = this.noteIconPosition === 'top-left' || this.noteIconPosition === 'bottom-left';

        if (!this.hideText) {
            ctx.font = `${this.fontSize}px ${this.fontFamily}`;
            ctx.fillStyle = this.textColor;
            ctx.textBaseline = 'top';

            // Reserve (iconSize + gap) on the icon's corner axes so text never overlaps it
            const iconReserve = this.noteIcon ? iconSize + 4 : 0;
            const textX = this.x + this.padding + (isLeft ? iconReserve : 0);
            const maxWidth = this.width - this.padding * 2 - iconReserve;
            const textYStart = this.y + this.padding + (isTop ? iconReserve : 0);
            const textYEnd = this.y + this.height - this.padding - (isTop ? 0 : iconReserve);

            const lines = this.wrapText(ctx, this.text, maxWidth);
            let yPos = textYStart;
            for (const line of lines) {
                if (yPos + this.fontSize > textYEnd) break;
                if (!line.isLastInParagraph && line.text.includes(' ')) {
                    this.drawJustifiedLine(ctx, line.text, textX, yPos, maxWidth);
                } else {
                    ctx.fillText(line.text, textX, yPos, maxWidth);
                }
                yPos += this.lineHeightPx;
            }
        }

        if (this.noteIcon) {
            const iconX = isLeft ? this.x + this.padding : this.x + this.width - this.padding - iconSize;
            const iconY = isTop ? this.y + this.padding : this.y + this.height - this.padding - iconSize;
            const bitmap = iconCache.get(this.noteIcon, iconSize, this.accentColor);
            if (bitmap) {
                ctx.drawImage(bitmap, iconX, iconY, iconSize, iconSize);
            } else {
                this.ensureIconCached();
            }
        }

        ctx.restore();
        this.drawResizeHandles(ctx);
    }

    /**
     * Get nearest border point for connections (not typically used for notes, but required by base class)
     */
    override getNearestBorderPoint(px: number, py: number): { point: { x: number; y: number }; side: 'top' | 'right' | 'bottom' | 'left'; offset: number } | null {
        return null;
    }

    clone(): Note {
        return new Note({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            backgroundColor: this.backgroundColor,
            accentColor: this.accentColor,
            borderColor: this.borderColor,
            padding: this.padding,
            lineHeight: this.lineHeight,
            noteIcon: this.noteIcon,
            noteIconPosition: this.noteIconPosition,
        });
    }

    static override get type(): string {
        return 'text';
    }

    static override get displayName(): string {
        return 'Note';
    }

    static override createDefault(): Note {
        return new Note({
            text: 'Note',
            width: 200,
            height: 100
        });
    }
}
