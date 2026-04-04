/**
 * Component
 *
 */
import { DiagramElement } from './diagramElement';
import type { ElementOptions, ColorStop, ShadowOptions } from './types';
export declare class Component extends DiagramElement {
    borderRadius: number;
    gradientColors: ColorStop[];
    shadowOptions: ShadowOptions;
    borderColor: string;
    borderWidth: number;
    titleColor: string;
    titleFont: string;
    icon: string;
    iconColor: string;
    description: string;
    descriptionFont: string;
    descriptionColor: string;
    hideDescription: boolean;
    private iconLoaded;
    constructor(options?: ElementOptions);
    /**
     * Load the icon into cache
     */
    private loadIcon;
    /**
     * Set icon and load it
     */
    setIcon(iconName: string, color?: string): void;
    /**
     * Check if a point is in the description area (for double-click editing)
     */
    isPointInDescriptionArea(px: number, py: number): boolean;
    draw(ctx: CanvasRenderingContext2D, _scale?: number): void;
    clone(): Component;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Component;
}
