/**
 * ContainerElement
 * Base class for container elements (Module, Domain) that can hold child elements
 */

import { DiagramElement } from './diagramElement';
import { ShapeDrawer } from './shape-drawer';
import type { DiagramElementOptions, ColorStop, ShadowOptions, TitlePosition } from './types';

export interface ContainerElementOptions extends DiagramElementOptions {
    borderRadius?: number;
    gradientColors?: ColorStop[];
    shadowOptions?: ShadowOptions;
    borderColor?: string;
    borderWidth?: number;
    titleColor?: string;
    titleFont?: string;
    padding?: number;
    childIds?: string[];
    titlePosition?: TitlePosition;
}

export abstract class ContainerElement extends DiagramElement {
    public borderRadius: number;
    public gradientColors: ColorStop[];
    public shadowOptions: ShadowOptions;
    public borderColor: string;
    public borderWidth: number;
    public titleColor: string;
    public titleFont: string;
    public padding: number;
    public titlePosition: TitlePosition;

    // Children management
    protected _children: DiagramElement[] = [];

    // Abstract properties that subclasses must define
    protected abstract readonly titleHeight: number;

    protected get extraTopOffset(): number { return 0; }
    protected abstract readonly minWidth: number;
    protected abstract readonly minHeight: number;
    protected abstract readonly defaultGradientColors: ColorStop[];
    protected abstract readonly defaultShadowOptions: ShadowOptions;
    protected abstract readonly defaultBorderColor: string;
    protected abstract readonly defaultBorderWidth: number;
    protected abstract readonly defaultBorderRadius: number;
    protected abstract readonly defaultTitleFont: string;
    protected abstract readonly defaultPadding: number;

    constructor(options: ContainerElementOptions = {}) {
        super(options);
        // These will be set by the subclass constructor after calling super
        this.borderRadius = 0;
        this.gradientColors = [];
        this.shadowOptions = {};
        this.borderColor = '';
        this.borderWidth = 0;
        this.titleColor = options.titleColor ?? '#1F2937';
        this.titleFont = '';
        this.padding = 0;
        this.titlePosition = options.titlePosition ?? 'top';
    }

    /**
     * Initialize container-specific properties (call from subclass constructor)
     */
    protected initContainerProps(options: ContainerElementOptions): void {
        this.borderRadius = options.borderRadius ?? this.defaultBorderRadius;
        this.gradientColors = options.gradientColors ?? this.defaultGradientColors;
        this.shadowOptions = options.shadowOptions ?? this.defaultShadowOptions;
        this.borderColor = options.borderColor ?? this.defaultBorderColor;
        this.borderWidth = options.borderWidth ?? this.defaultBorderWidth;
        this.titleColor = options.titleColor ?? '#1F2937';
        this.titleFont = options.titleFont ?? this.defaultTitleFont;
        this.padding = options.padding ?? this.defaultPadding;
    }

    // ========================================================================
    // Children Management
    // ========================================================================

    get children(): DiagramElement[] {
        return [...this._children];
    }

    addChild(component: DiagramElement): void {
        if (component === this) return;
        if (!this._children.includes(component)) {
            this._children.push(component);
            component.parentId = this.id;
            this.recalculateBounds();
        }
    }

    addChildren(components: DiagramElement[]): void {
        let added = false;
        for (const comp of components) {
            if (comp === this || this._children.includes(comp)) continue;
            this._children.push(comp);
            comp.parentId = this.id;
            added = true;
        }
        if (added) this.recalculateBounds();
    }

    removeChild(component: DiagramElement): void {
        const index = this._children.indexOf(component);
        if (index > -1) {
            this._children.splice(index, 1);
            component.parentId = null;
            this.recalculateBounds();
        }
    }

    hasChild(component: DiagramElement): boolean {
        return this._children.includes(component);
    }

    getChildById(id: string): DiagramElement | undefined {
        return this._children.find(c => c.id === id);
    }

    getChildIds(): string[] {
        return this._children.map(c => c.id);
    }

    // ========================================================================
    // Title band (title + optional description row, at top or bottom)
    // ========================================================================

    /** Total height of the title band: title row plus any description row. */
    get titleBandHeight(): number {
        return this.titleHeight + this.extraTopOffset;
    }

    /** World Y of the top of the title band, honoring titlePosition. */
    get titleBandY(): number {
        return this.titlePosition === 'bottom'
            ? this.y + this.height - this.titleBandHeight
            : this.y;
    }

    /**
     * Check if a point is within the container's content area (for drop detection)
     */
    containsPointInContentArea(px: number, py: number): boolean {
        const contentX = this.x + this.padding / 2;
        const contentWidth = this.width - this.padding;
        const contentHeight = this.height - this.titleBandHeight - this.padding / 2;
        // Content sits opposite the title band.
        const contentY = this.titlePosition === 'bottom'
            ? this.y + this.padding / 2
            : this.y + this.titleBandHeight;

        return px >= contentX &&
            px <= contentX + contentWidth &&
            py >= contentY &&
            py <= contentY + contentHeight;
    }

    // ========================================================================
    // Bounds Calculation
    // ========================================================================

    /**
     * Recalculate container bounds based on children
     */
    recalculateBounds(): void {
        if (this._children.length === 0) {
            // Keep minimum size when empty
            this.width = Math.max(this.width, this.minWidth);
            this.height = Math.max(this.height, this.minHeight);
            return;
        }

        // Calculate bounding box of all children
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const child of this._children) {
            minX = Math.min(minX, child.x);
            minY = Math.min(minY, child.y);
            maxX = Math.max(maxX, child.x + child.width);
            maxY = Math.max(maxY, child.y + child.height);
        }

        // Calculate new container bounds with padding
        const childrenWidth = maxX - minX;
        const childrenHeight = maxY - minY;

        const bandHeight = this.titleBandHeight;

        let newWidth = childrenWidth + this.padding * 2;
        let newHeight = childrenHeight + bandHeight + this.padding * 1.5;

        // Apply minimum size constraints and center the container around children
        const finalWidth = Math.max(newWidth, this.minWidth);
        const finalHeight = Math.max(newHeight, this.minHeight);

        // Center horizontally: extra width (from min constraint) is split equally
        const extraWidth = finalWidth - newWidth;
        this.x = minX - this.padding - extraWidth / 2;
        this.width = finalWidth;

        // Center vertically: reserve the title band on its configured side
        const extraHeight = finalHeight - newHeight;
        this.y = this.titlePosition === 'bottom'
            ? minY - this.padding - extraHeight / 2
            : minY - bandHeight - this.padding / 2 - extraHeight / 2;
        this.height = finalHeight;
    }

    // ========================================================================
    // Movement
    // ========================================================================

    override moveBy(dx: number, dy: number, _visited?: Set<string>): void {
        const visited = _visited ?? new Set<string>();
        if (visited.has(this.id)) return; // break any accidental cycle
        visited.add(this.id);
        super.moveBy(dx, dy);
        // Move all children with the container
        for (const child of this._children) {
            if (child instanceof ContainerElement) {
                child.moveBy(dx, dy, visited);
            } else {
                child.moveBy(dx, dy);
            }
        }
    }

    override moveTo(x: number, y: number): void {
        const dx = x - this.x;
        const dy = y - this.y;
        this.moveBy(dx, dy);
    }

    // ========================================================================
    // Drawing Helpers
    // ========================================================================

    /**
     * Draw the container background, border, and selection state
     * Subclasses can customize via parameters
     */
    protected drawContainerBase(
        ctx: CanvasRenderingContext2D,
        drawer: ShapeDrawer,
        options: {
            highlightAlpha?: number;
            selectionOffset?: number;
            selectionDashPattern?: number[];
        } = {}
    ): void {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        const radius = this.borderRadius;
        const highlightAlpha = options.highlightAlpha ?? 0.15;
        const selectionOffset = options.selectionOffset ?? 3;
        const selectionDashPattern = options.selectionDashPattern ?? [5, 5];

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
            x, y, x, y + height * 0.3,
            [
                { offset: 0, color: `rgba(255, 255, 255, ${highlightAlpha})` },
                { offset: 1, color: 'rgba(255, 255, 255, 0)' }
            ]
        );
        drawer.roundedRect(x + 1, y + 1, width - 2, height * 0.3, radius - 1);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // Draw content area (opposite side of the title band)
        const contentX = x + this.padding / 2;
        const contentY = this.titlePosition === 'bottom' ? y + this.padding / 2 : y + this.titleHeight;
        const contentWidth = width - this.padding;
        const contentHeight = height - this.titleHeight - this.padding / 2;

        drawer.roundedRect(contentX, contentY, contentWidth, contentHeight, radius - 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.fill();

        // Draw border
        drawer.roundedRect(x, y, width, height, radius);
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();

        // Draw selection indicator
        if (this.selected) {
            drawer.roundedRect(
                x - selectionOffset,
                y - selectionOffset,
                width + selectionOffset * 2,
                height + selectionOffset * 2,
                radius + selectionOffset
            );
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.setLineDash(selectionDashPattern);
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

        // Draw title in the title band (top by default, bottom if configured)
        if (!this.hideTitle) {
            drawer.drawText(this.title, x + width / 2, this.titleBandY + this.titleHeight / 2 + 9, {
                font: this.titleFont,
                color: this.titleColor,
                align: 'center',
                baseline: 'middle',
                maxWidth: width - 20
            });
        }

        ctx.restore();

        // Draw resize handles when selected
        this.drawResizeHandles(ctx);
    }

    // ========================================================================
    // Serialization
    // ========================================================================

    restoreChildren(allComponents: DiagramElement[]): void {
        // Restore child references, skipping any that would create a cycle
        for (const comp of allComponents) {
            if (comp.parentId === this.id && comp !== this && !this._children.includes(comp)) {
                // Ensure comp is not an ancestor of this (prevents A→B→A cycles)
                if (comp.id !== this.parentId) {
                    this._children.push(comp);
                }
            }
        }
    }
}
