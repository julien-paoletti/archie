/**
 * Module Component
 * A container element for grouping diagram components
 */

import { ContainerElement, type ContainerElementOptions } from './containerElement';
import { ShapeDrawer } from './shape-drawer';
import type { ColorStop, ShadowOptions } from './types';
import { MODULE_PADDING, MODULE_TITLE_HEIGHT, MODULE_MIN_WIDTH, MODULE_MIN_HEIGHT } from './constants';

export interface ModuleOptions extends ContainerElementOptions {}

export class Module extends ContainerElement {
    // Required abstract property implementations
    protected readonly titleHeight = MODULE_TITLE_HEIGHT;
    protected readonly minWidth = MODULE_MIN_WIDTH;
    protected readonly minHeight = MODULE_MIN_HEIGHT;
    protected readonly defaultGradientColors: ColorStop[] = [
        { offset: 0, color: '#EFF6FF' },
        { offset: 1, color: '#DBEAFE' }
    ];
    protected readonly defaultShadowOptions: ShadowOptions = {
        color: 'rgba(0, 0, 0, 0.1)',
        blur: 20,
        offsetX: 0,
        offsetY: 8
    };
    protected readonly defaultBorderColor = '#93C5FD';
    protected readonly defaultBorderWidth = 1;
    protected readonly defaultBorderRadius = 12;
    protected readonly defaultTitleFont = 'bold 14px "Segoe UI", sans-serif';
    protected readonly defaultPadding = MODULE_PADDING;

    constructor(options: ModuleOptions = {}) {
        super(options);
        this.initContainerProps(options);

        // Set default dimensions for an empty module
        this.width = options.width ?? 200;
        this.height = options.height ?? 150;
    }

    // ========================================================================
    // Drawing
    // ========================================================================

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const drawer = new ShapeDrawer(ctx);
        this.drawContainerBase(ctx, drawer, {
            highlightAlpha: 0.15,
            selectionOffset: 3,
            selectionDashPattern: [5, 5]
        });

        // Note: Children are drawn separately by the Editor, not by the Module
        // This ensures proper z-ordering and selection handling
    }

    // ========================================================================
    // Clone and Static Methods
    // ========================================================================

    clone(): Module {
        const cloned = new Module({
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
            padding: this.padding
        });
        // Note: Children are not cloned - the clone is empty
        return cloned;
    }

    static override get type(): string {
        return 'module';
    }

    static override get displayName(): string {
        return 'Module';
    }

    static override createDefault(): Module {
        return new Module({
            title: 'Module',
            width: 200,
            height: 150
        });
    }
}
