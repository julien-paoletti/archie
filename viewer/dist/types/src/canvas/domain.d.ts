/**
 * Domain Component
 * A high-level container for grouping modules and components
 */
import { ContainerElement, type ContainerElementOptions } from './containerElement';
import type { ColorStop, ShadowOptions } from './types';
export interface DomainOptions extends ContainerElementOptions {
}
export declare class Domain extends ContainerElement {
    protected readonly titleHeight = 36;
    protected readonly minWidth = 250;
    protected readonly minHeight = 150;
    protected readonly defaultGradientColors: ColorStop[];
    protected readonly defaultShadowOptions: ShadowOptions;
    protected readonly defaultBorderColor = "#94A3B8";
    protected readonly defaultBorderWidth = 2;
    protected readonly defaultBorderRadius = 16;
    protected readonly defaultTitleFont = "bold 16px \"Segoe UI\", sans-serif";
    protected readonly defaultPadding = 28;
    constructor(options?: DomainOptions);
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    clone(): Domain;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Domain;
}
