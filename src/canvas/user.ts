/**
 * User Element
 * Represents human stakeholders in architecture diagrams
 * Uses circular shape to distinguish from other rectangular elements
 */

import { DiagramElement } from './diagramElement';
import { ShapeDrawer } from './shape-drawer';
import { iconCache, TABLER_ICONS } from './iconCache';
import { HANDLE_SIZE, CONNECTION_POINT_HITBOX } from './constants';
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

export class User extends DiagramElement {
    public gradientColors: ColorStop[];
    public shadowOptions: ShadowOptions;
    public borderColor: string;
    public borderWidth: number;
    public titleColor: string;
    public titleFont: string;
    public iconColor: string;
    private iconLoaded: boolean = false;

    constructor(options: UserOptions = {}) {
        super(options);

        // Default size for user element (circular, so width = height)
        if (!options.width) this.width = 60;
        if (!options.height) this.height = 60;

        // Ensure circular shape
        const size = Math.max(this.width, this.height);
        this.width = size;
        this.height = size;

        // Purple/violet gradient to distinguish from other elements
        this.gradientColors = options.gradientColors ?? [
            { offset: 0, color: '#F5F3FF' },
            { offset: 1, color: '#EDE9FE' }
        ];
        this.shadowOptions = options.shadowOptions ?? {
            color: 'rgba(0, 0, 0, 0.1)',
            blur: 20,
            offsetX: 0,
            offsetY: 8
        };
        this.borderColor = options.borderColor ?? '#C4B5FD';
        this.borderWidth = options.borderWidth ?? 2;
        this.titleColor = options.titleColor ?? '#5B21B6';
        this.titleFont = options.titleFont ?? 'bold 12px "Segoe UI", sans-serif';
        this.iconColor = options.iconColor ?? '#7C3AED';

        // Pre-load user icon
        this.loadIcon();
    }

    private async loadIcon(): Promise<void> {
        if (this.iconLoaded) return;

        const svgString = TABLER_ICONS['user'];
        if (svgString) {
            const coloredSvg = svgString.replace('stroke="currentColor"', `stroke="${this.iconColor}"`);
            await iconCache.loadIcon('user', coloredSvg, 24);
            this.iconLoaded = true;
        }
    }

    /**
     * Get the center point of the circle
     */
    getCenter(): Point {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Get the radius of the circle
     */
    getRadius(): number {
        return this.width / 2;
    }

    /**
     * Override containsPoint for circular hit detection
     * Also includes the title area below the circle
     */
    override containsPoint(px: number, py: number): boolean {
        const center = this.getCenter();
        const radius = this.getRadius();

        // Check if point is in the circle
        const dx = px - center.x;
        const dy = py - center.y;
        if ((dx * dx + dy * dy) <= (radius * radius)) {
            return true;
        }

        // Check if point is in the title area below the circle
        const titleY = center.y + radius + 14;
        const titleWidth = 80; // Approximate title width
        const titleHeight = 20; // Approximate title height
        if (px >= center.x - titleWidth / 2 &&
            px <= center.x + titleWidth / 2 &&
            py >= titleY - titleHeight / 2 &&
            py <= titleY + titleHeight / 2) {
            return true;
        }

        return false;
    }

    /**
     * Override to maintain circular shape during resize
     */
    override resize(handle: ResizeHandle, dx: number, dy: number, minWidth: number = 50, minHeight: number = 50): void {
        if (!handle) return;

        // For circle, use the larger delta to maintain aspect ratio
        let delta = 0;

        if (handle === 'top-left') {
            delta = Math.max(-dx, -dy);
        } else if (handle === 'top-right') {
            delta = Math.max(dx, -dy);
        } else if (handle === 'bottom-left') {
            delta = Math.max(-dx, dy);
        } else if (handle === 'bottom-right') {
            delta = Math.max(dx, dy);
        } else if (handle === 'top' || handle === 'bottom') {
            delta = handle === 'top' ? -dy : dy;
        } else if (handle === 'left' || handle === 'right') {
            delta = handle === 'left' ? -dx : dx;
        }

        const newSize = Math.max(minWidth, this.width + delta);

        // Adjust position based on handle
        if (handle.includes('left')) {
            this.x -= (newSize - this.width);
        }
        if (handle.includes('top')) {
            this.y -= (newSize - this.height);
        }

        this.width = newSize;
        this.height = newSize;
    }

    /**
     * Override getNearestBorderPoint for circular border
     */
    override getNearestBorderPoint(px: number, py: number, threshold: number = CONNECTION_POINT_HITBOX): { point: Point; side: 'top' | 'right' | 'bottom' | 'left'; offset: number } | null {
        const center = this.getCenter();
        const radius = this.getRadius();
        const dx = px - center.x;
        const dy = py - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if point is near the circle border (inside or outside within threshold)
        const distFromBorder = Math.abs(dist - radius);
        if (distFromBorder > threshold) return null;

        // Calculate the point on the circle border
        const angle = Math.atan2(dy, dx);
        const point = {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
        };

        // Determine the "side" based on angle for compatibility
        let side: 'top' | 'right' | 'bottom' | 'left';
        if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
            side = 'right';
        } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
            side = 'bottom';
        } else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) {
            side = 'top';
        } else {
            side = 'left';
        }

        // Offset is the normalized angle (0-1)
        const offset = (angle + Math.PI) / (2 * Math.PI);

        return { point, side, offset };
    }

    /**
     * Override getPointOnBorder for circular shape
     */
    override getPointOnBorder(side: 'top' | 'right' | 'bottom' | 'left', offset: number): Point {
        const center = this.getCenter();
        const radius = this.getRadius();

        // Convert side and offset to angle
        let baseAngle: number;
        switch (side) {
            case 'right':
                baseAngle = 0;
                break;
            case 'bottom':
                baseAngle = Math.PI / 2;
                break;
            case 'left':
                baseAngle = Math.PI;
                break;
            case 'top':
                baseAngle = -Math.PI / 2;
                break;
        }

        // Offset adjusts within the quadrant (simplified for circle)
        const angle = baseAngle + (offset - 0.5) * (Math.PI / 2);

        return {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
        };
    }

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const drawer = new ShapeDrawer(ctx);

        const center = this.getCenter();
        const radius = this.getRadius();

        ctx.save();

        // Draw shadow
        drawer.applyShadow(this.shadowOptions);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        drawer.clearShadow();

        // Draw gradient background
        const gradient = ctx.createRadialGradient(
            center.x, center.y - radius * 0.3, 0,
            center.x, center.y, radius
        );
        this.gradientColors.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw subtle inner highlight
        const highlightGradient = ctx.createRadialGradient(
            center.x, center.y - radius * 0.4, 0,
            center.x, center.y - radius * 0.2, radius * 0.6
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius - 1, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // Draw border
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();

        // Draw selection indicator
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw hover effect
        if (this.hovered && !this.selected) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw user icon centered in circle
        const iconSize = 24;
        const hasIcon = iconCache.has('user', iconSize);

        if (hasIcon) {
            iconCache.draw(ctx, 'user', center.x - iconSize / 2, center.y - iconSize / 2, iconSize);
        } else {
            // Fallback: draw a simple user silhouette
            ctx.beginPath();
            ctx.arc(center.x, center.y - 4, 6, 0, Math.PI * 2);
            ctx.fillStyle = this.iconColor;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center.x, center.y + 6, 9, Math.PI, 0);
            ctx.fill();
        }

        // Draw title below the circle (unless hidden for editing)
        if (!this.hideTitle) {
            const titleY = center.y + radius + 14;
            drawer.drawText(this.title, center.x, titleY, {
                font: this.titleFont,
                color: this.titleColor,
                align: 'center',
                baseline: 'middle'
            });
        }

        ctx.restore();

        // Draw resize handles when selected
        this.drawCircleResizeHandles(ctx);
    }

    /**
     * Draw resize handles at cardinal points for circular shape
     */
    private drawCircleResizeHandles(ctx: CanvasRenderingContext2D): void {
        if (!this.selected) return;

        const size = HANDLE_SIZE;
        const half = size / 2;
        const center = this.getCenter();
        const radius = this.getRadius();

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;

        // Four cardinal handles
        const handles: Point[] = [
            { x: center.x, y: center.y - radius },      // top
            { x: center.x + radius, y: center.y },      // right
            { x: center.x, y: center.y + radius },      // bottom
            { x: center.x - radius, y: center.y }       // left
        ];

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(handle.x - half, handle.y - half, size, size);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * Override getResizeHandleAtPoint for circular handles
     */
    override getResizeHandleAtPoint(px: number, py: number): ResizeHandle {
        if (!this.selected) return null;

        const hitbox = 8;
        const center = this.getCenter();
        const radius = this.getRadius();

        // Check cardinal points
        if (Math.abs(px - center.x) <= hitbox && Math.abs(py - (center.y - radius)) <= hitbox) return 'top';
        if (Math.abs(px - (center.x + radius)) <= hitbox && Math.abs(py - center.y) <= hitbox) return 'right';
        if (Math.abs(px - center.x) <= hitbox && Math.abs(py - (center.y + radius)) <= hitbox) return 'bottom';
        if (Math.abs(px - (center.x - radius)) <= hitbox && Math.abs(py - center.y) <= hitbox) return 'left';

        return null;
    }

    clone(): User {
        return new User({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            title: this.title,
            gradientColors: [...this.gradientColors],
            shadowOptions: { ...this.shadowOptions },
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            titleColor: this.titleColor,
            titleFont: this.titleFont,
            iconColor: this.iconColor
        });
    }

    static override get type(): string {
        return 'user';
    }

    static override get displayName(): string {
        return 'User';
    }

    static override createDefault(): User {
        return new User({
            title: 'User',
            width: 40,
            height: 40
        });
    }
}
