/**
 * Element Registry
 * Factory/Registry for managing element types
 */

import type { ElementConstructor, DiagramElementOptions } from './types';
import type { DiagramElement } from './diagramElement';

export class ElementRegistry {
    private components: Map<string, ElementConstructor>;

    constructor() {
        this.components = new Map();
    }

    register(ElementClass: ElementConstructor): void {
        this.components.set(ElementClass.type, ElementClass);
    }

    get(type: string): ElementConstructor | undefined {
        return this.components.get(type);
    }

    getAll(): ElementConstructor[] {
        return Array.from(this.components.values());
    }

    createInstance(type: string, options: DiagramElementOptions = {}): DiagramElement {
        const ElementClass = this.get(type);
        if (!ElementClass) {
            throw new Error(`Unknown component type: ${type}`);
        }
        return new ElementClass(options);
    }
}

// Create and export default registry
export const elementRegistry = new ElementRegistry();
