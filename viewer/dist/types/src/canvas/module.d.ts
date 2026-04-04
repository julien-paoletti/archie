/**
 * Module Component
 * A container element for grouping diagram components
 */
import { ContainerElement, type ContainerElementOptions } from './containerElement';
import type { ColorStop, ShadowOptions } from './types';
export interface ModuleOptions extends ContainerElementOptions {
}
export declare class Module extends ContainerElement {
    protected readonly titleHeight = 29;
    protected readonly minWidth = 150;
    protected readonly minHeight = 100;
    protected readonly defaultGradientColors: ColorStop[];
    protected readonly defaultShadowOptions: ShadowOptions;
    protected readonly defaultBorderColor = "#93C5FD";
    protected readonly defaultBorderWidth = 1;
    protected readonly defaultBorderRadius = 12;
    protected readonly defaultTitleFont = "bold 14px \"Segoe UI\", sans-serif";
    protected readonly defaultPadding = 22;
    constructor(options?: ModuleOptions);
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    clone(): Module;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Module;
}
