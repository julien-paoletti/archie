/**
 * Component
 *
 */

import { DiagramElement } from './diagramElement';
import { ShapeDrawer } from './shape-drawer';
import { iconCache, TABLER_ICONS } from './iconCache';
import type { ElementOptions, ColorStop, ShadowOptions } from './types';

export class Component extends DiagramElement {
    public borderRadius: number;
    public gradientColors: ColorStop[];
    public shadowOptions: ShadowOptions;
    public borderColor: string;
    public borderWidth: number;
    public titleColor: string;
    public titleFont: string;
    public icon: string;
    public iconColor: string;
    public description: string;
    public descriptionFont: string;
    public descriptionColor: string;
    public hideDescription: boolean = false;
    private iconLoaded: boolean = false;

    constructor(options: ElementOptions = {}) {
        super(options);
        this.borderRadius = options.borderRadius ?? 12;
        // Rose/Pink gradient for better contrast against blue Domain and teal Module
        this.gradientColors = options.gradientColors ?? [
            { offset: 0, color: '#FAFAFA ' },
            { offset: 1, color: '#F4F4F5' }
        ];
        this.shadowOptions = options.shadowOptions ?? {
            color: 'rgba(0, 0, 0, 0.1)',
            blur: 20,
            offsetX: 0,
            offsetY: 8
        };
        this.borderColor = options.borderColor ?? '#D4D4D8';
        this.borderWidth = options.borderWidth ?? 1;
        this.titleColor = options.titleColor ?? '#1F2937';
        this.titleFont = options.titleFont ?? 'bold 14px "Segoe UI", sans-serif';
        this.icon = options.icon ?? '';
        this.iconColor = options.iconColor ?? '#64748B';
        this.description = options.description ?? '';
        this.descriptionFont = '12px "Segoe UI", sans-serif';
        this.descriptionColor = '#6B7280';

        // Pre-load icon if specified
        if (this.icon) {
            this.loadIcon();
        }
    }

    /**
     * Load the icon into cache
     */
    private async loadIcon(): Promise<void> {
        if (!this.icon || this.iconLoaded) return;

        const svgString = TABLER_ICONS[this.icon];
        if (svgString) {
            // Replace currentColor with the specified color
            const coloredSvg = svgString.replace('stroke="currentColor"', `stroke="${this.iconColor}"`);
            await iconCache.loadIcon(this.icon, coloredSvg, 24);
            this.iconLoaded = true;
        }
    }

    /**
     * Set icon and load it
     */
    setIcon(iconName: string, color?: string): void {
        this.icon = iconName;
        if (color) this.iconColor = color;
        this.iconLoaded = false;
        this.loadIcon();
    }


    /**
     * Check if a point is in the description area (for double-click editing)
     */
    isPointInDescriptionArea(px: number, py: number): boolean {
        if (!this.description || this.description.length === 0) {
            return false;
        }

        // Description is drawn at y + height/2 + 12
        const descY = this.y + this.height / 2 + 12;
        const descHeight = 16; // Approximate line height

        return px >= this.x &&
            px <= this.x + this.width &&
            py >= descY - descHeight / 2 &&
            py <= descY + descHeight / 2;
    }

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const drawer = new ShapeDrawer(ctx);

        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        const radius = this.borderRadius;

        ctx.save();

        // Draw shadow
        drawer.applyShadow(this.shadowOptions);
        drawer.roundedRect(x, y, width, height, radius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        drawer.clearShadow();

        // Draw gradient background
        const gradient = drawer.createLinearGradient(
            x, y, x, y + height,
            this.gradientColors
        );
        drawer.roundedRect(x, y, width, height, radius);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw subtle inner highlight
        const highlightGradient = drawer.createLinearGradient(
            x, y, x, y + height * 0.5,
            [
                { offset: 0, color: 'rgba(255, 255, 255, 0.15)' },
                { offset: 1, color: 'rgba(255, 255, 255, 0)' }
            ]
        );
        drawer.roundedRect(x + 1, y + 1, width - 2, height * 0.5, radius - 1);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // Draw border
        drawer.roundedRect(x, y, width, height, radius);
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();

        // Draw selection indicator
        if (this.selected) {
            drawer.roundedRect(x - 3, y - 3, width + 6, height + 6, radius + 3);
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw hover effect
        if (this.hovered && !this.selected) {
            drawer.roundedRect(x, y, width, height, radius);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Check if component has description
        const hasDescription = this.description && this.description.length > 0;

        // Draw icon and title (unless hidden for editing)
        if (!this.hideTitle) {
            const iconSize = 24;
            const hasIcon = this.icon && iconCache.has(this.icon, iconSize);
            const gap = 8; // Gap between icon and title

            // Calculate vertical offset when description exists or when editing description
            const titleOffset = (hasDescription || this.hideDescription) ? -10 : 0;

            if (hasIcon) {
                // Calculate combined width of icon + gap + title
                ctx.font = this.titleFont;
                const textMetrics = ctx.measureText(this.title);
                const textWidth = Math.min(textMetrics.width, width - iconSize - gap - 20);
                const totalWidth = iconSize + gap + textWidth;

                // Center the icon + title combination
                const startX = x + (width - totalWidth) / 2;
                const centerY = y + height / 2 + titleOffset;

                // Draw icon
                iconCache.draw(ctx, this.icon, startX, centerY - iconSize / 2, iconSize);

                // Draw title next to icon
                drawer.drawText(this.title, startX + iconSize + gap + textWidth / 2, centerY, {
                    font: this.titleFont,
                    color: this.titleColor,
                    align: 'center',
                    baseline: 'middle',
                    maxWidth: width - iconSize - gap - 20
                });
            } else {
                // No icon, just draw centered title
                drawer.drawText(this.title, x + width / 2, y + height / 2 + titleOffset, {
                    font: this.titleFont,
                    color: this.titleColor,
                    align: 'center',
                    baseline: 'middle',
                    maxWidth: width - 20
                });
            }
        }

        // Draw description (independent of title visibility)
        if (hasDescription && !this.hideDescription) {
            // Draw description below title
            drawer.drawText(this.description, x + width / 2, y + height / 2 + 12, {
                font: this.descriptionFont,
                color: this.descriptionColor,
                align: 'center',
                baseline: 'middle',
                maxWidth: width - 20
            });
        }

        ctx.restore();

        // Draw resize handles when selected
        this.drawResizeHandles(ctx);
    }

    clone(): Component {
        return new Component({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            title: this.title,
            borderRadius: this.borderRadius,
            gradientColors: [...this.gradientColors],
            shadowOptions: { ...this.shadowOptions },
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            titleColor: this.titleColor,
            titleFont: this.titleFont,
            icon: this.icon,
            iconColor: this.iconColor,
            description: this.description
        });
    }

    static override get type(): string {
        return 'component';
    }

    static override get displayName(): string {
        return 'Component';
    }

    static override createDefault(): Component {
        return new Component({
            title: 'Component',
            width: 160,
            height: 80
        });
    }
}
