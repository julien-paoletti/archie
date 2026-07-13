/**
 * Domain Component
 * A high-level container for grouping modules and components
 */

import { ContainerElement, type ContainerElementOptions } from './containerElement';
import { ShapeDrawer } from './shape-drawer';
import type { ColorStop, ShadowOptions } from './types';
import { DOMAIN_PADDING, DOMAIN_TITLE_HEIGHT, DOMAIN_MIN_WIDTH, DOMAIN_MIN_HEIGHT } from './constants';

export interface DomainOptions extends ContainerElementOptions {}

export class Domain extends ContainerElement {
    // Required abstract property implementations
    protected readonly titleHeight = DOMAIN_TITLE_HEIGHT;
    protected readonly minWidth = DOMAIN_MIN_WIDTH;
    protected readonly minHeight = DOMAIN_MIN_HEIGHT;
    protected readonly defaultGradientColors: ColorStop[] = [
        { offset: 0, color: '#F1F5F9' },
        { offset: 1, color: '#E2E8F0' }
    ];
    protected readonly defaultShadowOptions: ShadowOptions = {
        color: 'rgba(0, 0, 0, 0.1)',
        blur: 24,
        offsetX: 0,
        offsetY: 10
    };
    protected readonly defaultBorderColor = '#94A3B8';
    protected readonly defaultBorderWidth = 2;
    protected readonly defaultBorderRadius = 16;
    protected readonly defaultTitleFont = 'bold 16px "Segoe UI", sans-serif';
    protected readonly defaultPadding = DOMAIN_PADDING;

    constructor(options: DomainOptions = {}) {
        super(options);
        this.initContainerProps(options);

        // Set default dimensions for an empty domain
        this.width = options.width ?? 300;
        this.height = options.height ?? 200;
    }

    // ========================================================================
    // Drawing
    // ========================================================================

    draw(ctx: CanvasRenderingContext2D, _scale: number = 1): void {
        const drawer = new ShapeDrawer(ctx);
        this.drawContainerBase(ctx, drawer, {
            highlightAlpha: 0.2,
            selectionOffset: 4,
            selectionDashPattern: [6, 6]
        });
    }

    // ========================================================================
    // Clone and Static Methods
    // ========================================================================

    clone(): Domain {
        const cloned = new Domain({
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
        return 'domain';
    }

    static override get displayName(): string {
        return 'Domain';
    }

    static override createDefault(): Domain {
        return new Domain({
            title: 'Domain',
            width: 300,
            height: 200
        });
    }
}
