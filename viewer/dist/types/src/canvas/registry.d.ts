/**
 * Element Registry
 * Factory/Registry for managing element types
 */
import type { ElementConstructor, DiagramElementOptions } from './types';
import type { DiagramElement } from './diagramElement';
export declare class ElementRegistry {
    private components;
    constructor();
    register(ElementClass: ElementConstructor): void;
    get(type: string): ElementConstructor | undefined;
    getAll(): ElementConstructor[];
    createInstance(type: string, options?: DiagramElementOptions): DiagramElement;
}
export declare const elementRegistry: ElementRegistry;
