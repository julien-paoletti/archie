/**
 * Module Component
 * A container element for grouping diagram components
 */

import { ContainerElement, type ContainerElementOptions } from './containerElement';
import { ShapeDrawer } from './shape-drawer';
import type { ColorStop, ShadowOptions } from './types';
import { MODULE_PADDING, MODULE_TITLE_HEIGHT, MODULE_MIN_WIDTH, MODULE_MIN_HEIGHT, MODULE_DESCRIPTION_OFFSET } from './constants';

export interface ModuleOptions extends ContainerElementOptions {
    description?: string;
}

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

    public description: string;
    public hideDescription: boolean = false;
    public readonly descriptionFont = '12px "Segoe UI", sans-serif';

    // 28 = MODULE_DESCRIPTION_OFFSET (16) + half font-size (6) + spacing (6)
    protected override get extraTopOffset(): number { return this.description ? MODULE_DESCRIPTION_OFFSET + 12 : 0; }

    constructor(options: ModuleOptions = {}) {
        super(options);
        this.initContainerProps(options);
        this.description = options.description ?? '';

        // Set default dimensions for an empty module
        this.width = options.width ?? 200;
        this.height = options.height ?? 150;
    }

    isPointInDescriptionArea(px: number, py: number): boolean {
        if (!this.description) return false;
        const descY = this.y + this.titleHeight + MODULE_DESCRIPTION_OFFSET;
        const descHeight = 16;
        return px >= this.x && px <= this.x + this.width &&
            py >= descY - descHeight / 2 && py <= descY + descHeight / 2;
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

        if (this.description && !this.hideDescription) {
            drawer.drawText(this.description, this.x + this.width / 2, this.y + this.titleHeight + MODULE_DESCRIPTION_OFFSET, {
                font: this.descriptionFont,
                color: '#6B7280',
                align: 'center',
                baseline: 'middle',
                maxWidth: this.width - 20
            });
        }
    }

    // ========================================================================
    // Clone and Static Methods
    // ========================================================================

    clone(): Module {
        return new Module({
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
            description: this.description
        });
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
