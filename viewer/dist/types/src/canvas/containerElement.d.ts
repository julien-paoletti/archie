/**
 * ContainerElement
 * Base class for container elements (Module, Domain) that can hold child elements
 */
import { DiagramElement } from './diagramElement';
import { ShapeDrawer } from './shape-drawer';
import type { DiagramElementOptions, ColorStop, ShadowOptions } from './types';
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
}
export declare abstract class ContainerElement extends DiagramElement {
    borderRadius: number;
    gradientColors: ColorStop[];
    shadowOptions: ShadowOptions;
    borderColor: string;
    borderWidth: number;
    titleColor: string;
    titleFont: string;
    padding: number;
    protected _children: DiagramElement[];
    protected abstract readonly titleHeight: number;
    protected abstract readonly minWidth: number;
    protected abstract readonly minHeight: number;
    protected abstract readonly defaultGradientColors: ColorStop[];
    protected abstract readonly defaultShadowOptions: ShadowOptions;
    protected abstract readonly defaultBorderColor: string;
    protected abstract readonly defaultBorderWidth: number;
    protected abstract readonly defaultBorderRadius: number;
    protected abstract readonly defaultTitleFont: string;
    protected abstract readonly defaultPadding: number;
    constructor(options?: ContainerElementOptions);
    /**
     * Initialize container-specific properties (call from subclass constructor)
     */
    protected initContainerProps(options: ContainerElementOptions): void;
    get children(): DiagramElement[];
    addChild(component: DiagramElement): void;
    removeChild(component: DiagramElement): void;
    hasChild(component: DiagramElement): boolean;
    getChildById(id: string): DiagramElement | undefined;
    getChildIds(): string[];
    /**
     * Check if a point is within the container's content area (for drop detection)
     */
    containsPointInContentArea(px: number, py: number): boolean;
    /**
     * Recalculate container bounds based on children
     */
    recalculateBounds(): void;
    moveBy(dx: number, dy: number, _visited?: Set<string>): void;
    moveTo(x: number, y: number): void;
    /**
     * Draw the container background, border, and selection state
     * Subclasses can customize via parameters
     */
    protected drawContainerBase(ctx: CanvasRenderingContext2D, drawer: ShapeDrawer, options?: {
        highlightAlpha?: number;
        selectionOffset?: number;
        selectionDashPattern?: number[];
    }): void;
    restoreChildren(allComponents: DiagramElement[]): void;
}
