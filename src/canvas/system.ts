/**
 * System Component
 * A top-level container for grouping domains
 */

import { ContainerElement, type ContainerElementOptions } from './containerElement';
import { ShapeDrawer } from './shape-drawer';
import type { ColorStop, ShadowOptions } from './types';
import { SYSTEM_PADDING, SYSTEM_TITLE_HEIGHT, SYSTEM_MIN_WIDTH, SYSTEM_MIN_HEIGHT } from './constants';

export interface SystemOptions extends ContainerElementOptions {}

export class System extends ContainerElement {
    // Required abstract property implementations
    protected readonly titleHeight = SYSTEM_TITLE_HEIGHT;
    protected readonly minWidth = SYSTEM_MIN_WIDTH;
    protected readonly minHeight = SYSTEM_MIN_HEIGHT;
    protected readonly defaultGradientColors: ColorStop[] = [
        { offset: 0, color: '#F8FAFC' },
        { offset: 1, color: '#F1F5F9' }
    ];
    protected readonly defaultShadowOptions: ShadowOptions = {
        color: 'rgba(0, 0, 0, 0.08)',
        blur: 32,
        offsetX: 0,
        offsetY: 12
    };
    protected readonly defaultBorderColor = '#64748B';
    protected readonly defaultBorderWidth = 2;
    protected readonly defaultBorderRadius = 20;
    protected readonly defaultTitleFont = 'bold 18px "Segoe UI", sans-serif';
    protected readonly defaultPadding = SYSTEM_PADDING;

    constructor(options: SystemOptions = {}) {
        super(options);
        this.initContainerProps(options);

        // Set default dimensions for an empty system
        this.width = options.width ?? 500;
        this.height = options.height ?? 350;
    }

    // ========================================================================
    // Drawing
    // ========================================================================

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const drawer = new ShapeDrawer(ctx);
        this.drawContainerBase(ctx, drawer, {
            highlightAlpha: 0.12,
            selectionOffset: 5,
            selectionDashPattern: [8, 6]
        });
    }

    // ========================================================================
    // Clone and Static Methods
    // ========================================================================

    clone(): System {
        const cloned = new System({
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
            padding: this.padding,
            titlePosition: this.titlePosition
        });
        return cloned;
    }

    static override get type(): string {
        return 'system';
    }

    static override get displayName(): string {
        return 'System';
    }

    static override createDefault(): System {
        return new System({
            title: 'System',
            width: 500,
            height: 350
        });
    }
}
