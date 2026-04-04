/**
 * System Component
 * A top-level container for grouping domains
 */
import { ContainerElement, type ContainerElementOptions } from './containerElement';
import type { ColorStop, ShadowOptions } from './types';
export interface SystemOptions extends ContainerElementOptions {
}
export declare class System extends ContainerElement {
    protected readonly titleHeight = 44;
    protected readonly minWidth = 400;
    protected readonly minHeight = 250;
    protected readonly defaultGradientColors: ColorStop[];
    protected readonly defaultShadowOptions: ShadowOptions;
    protected readonly defaultBorderColor = "#64748B";
    protected readonly defaultBorderWidth = 2;
    protected readonly defaultBorderRadius = 20;
    protected readonly defaultTitleFont = "bold 18px \"Segoe UI\", sans-serif";
    protected readonly defaultPadding = 36;
    constructor(options?: SystemOptions);
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    clone(): System;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): System;
}
