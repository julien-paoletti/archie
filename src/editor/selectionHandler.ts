/**
 * Selection Handler
 * Manages element/connection finding, selection, and sorting
 */

import {
    Boundary,
    CONNECTION_POINT_RADIUS,
    Connection,
    Domain,
    Module,
    System,
    NumberedDot,
    Tag,
    type ConnectionPoint,
    type DiagramElement,
    type Point
} from '../canvas/index';
import type { EditorState, HoverConnectionPoint } from './editorState';

export function findComponentAtPoint(state: EditorState, x: number, y: number): DiagramElement | null {
    let foundContainer: Module | Domain | System | null = null;

    for (let i = state.elements.length - 1; i >= 0; i--) {
        const component = state.elements[i];
        if (component && component.containsPoint(x, y)) {
            if (component instanceof Module || component instanceof Domain || component instanceof System) {
                // Prefer innermost container: Module > Domain > System
                if (!foundContainer) {
                    foundContainer = component;
                } else if (component instanceof Module && !(foundContainer instanceof Module)) {
                    foundContainer = component;
                } else if (component instanceof Domain && foundContainer instanceof System) {
                    foundContainer = component;
                }
            } else {
                return component;
            }
        }
    }

    return foundContainer;
}

export function findContainerAtPoint(state: EditorState, x: number, y: number, excludeComponent?: DiagramElement): Module | Domain | null {
    let foundDomain: Domain | null = null;

    for (let i = state.elements.length - 1; i >= 0; i--) {
        const component = state.elements[i];
        if (component && component !== excludeComponent && component.containsPoint(x, y)) {
            if (component instanceof Module) {
                return component;
            }
            if (component instanceof Domain && !foundDomain) {
                foundDomain = component;
            }
        }
    }
    return foundDomain;
}

export function findDomainAtPoint(state: EditorState, x: number, y: number, excludeComponent?: DiagramElement): Domain | null {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const component = state.elements[i];
        if (component instanceof Domain && component !== excludeComponent && component.containsPoint(x, y)) {
            return component;
        }
    }
    return null;
}

export function findSystemAtPoint(state: EditorState, x: number, y: number, excludeComponent?: DiagramElement): System | null {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const component = state.elements[i];
        if (component instanceof System && component !== excludeComponent && component.containsPoint(x, y)) {
            return component;
        }
    }
    return null;
}

export function findConnectionAtPoint(state: EditorState, x: number, y: number): Connection | null {
    for (let i = state.connections.length - 1; i >= 0; i--) {
        const connection = state.connections[i];
        if (connection && connection.containsPoint(x, y, state.elements)) {
            return connection;
        }
    }
    return null;
}

export function findConnectionPointAtPosition(state: EditorState, x: number, y: number): { connection: Connection; end: 'source' | 'target' } | null {
    const threshold = CONNECTION_POINT_RADIUS + 4;

    for (const connection of state.connections) {
        const sourceComponent = state.elements.find(c => c.id === connection.sourcePoint.componentId);
        if (sourceComponent) {
            const sourcePos = sourceComponent.getPointOnBorder(connection.sourcePoint.side, connection.sourcePoint.offset);
            const sourceDist = Math.sqrt((x - sourcePos.x) ** 2 + (y - sourcePos.y) ** 2);
            if (sourceDist <= threshold) {
                return { connection, end: 'source' };
            }
        }

        const targetComponent = state.elements.find(c => c.id === connection.targetPoint.componentId);
        if (targetComponent) {
            const targetPos = targetComponent.getPointOnBorder(connection.targetPoint.side, connection.targetPoint.offset);
            const targetDist = Math.sqrt((x - targetPos.x) ** 2 + (y - targetPos.y) ** 2);
            if (targetDist <= threshold) {
                return { connection, end: 'target' };
            }
        }
    }

    return null;
}

export function projectPointOnBorder(element: DiagramElement, px: number, py: number): { side: 'top' | 'right' | 'bottom' | 'left'; offset: number } {
    const x = element.x;
    const y = element.y;
    const w = element.width;
    const h = element.height;

    const candidates: Array<{ side: 'top' | 'right' | 'bottom' | 'left'; dist: number; offset: number }> = [];

    const topX = Math.max(x, Math.min(x + w, px));
    candidates.push({ side: 'top', dist: Math.abs(py - y) + (px < x || px > x + w ? Math.min(Math.abs(px - x), Math.abs(px - x - w)) : 0), offset: (topX - x) / w });

    const bottomX = Math.max(x, Math.min(x + w, px));
    candidates.push({ side: 'bottom', dist: Math.abs(py - (y + h)) + (px < x || px > x + w ? Math.min(Math.abs(px - x), Math.abs(px - x - w)) : 0), offset: (bottomX - x) / w });

    const leftY = Math.max(y, Math.min(y + h, py));
    candidates.push({ side: 'left', dist: Math.abs(px - x) + (py < y || py > y + h ? Math.min(Math.abs(py - y), Math.abs(py - y - h)) : 0), offset: (leftY - y) / h });

    const rightY = Math.max(y, Math.min(y + h, py));
    candidates.push({ side: 'right', dist: Math.abs(px - (x + w)) + (py < y || py > y + h ? Math.min(Math.abs(py - y), Math.abs(py - y - h)) : 0), offset: (rightY - y) / h });

    candidates.sort((a, b) => a.dist - b.dist);
    const best = candidates[0]!;
    return { side: best.side, offset: Math.max(0, Math.min(1, best.offset)) };
}

export function clearSelection(state: EditorState): void {
    for (const comp of state.selectedElements) {
        comp.selected = false;
    }
    state.selectedElements = [];
}

export function selectElement(state: EditorState, component: DiagramElement | null): void {
    clearSelection(state);

    if (component) {
        component.selected = true;
        state.selectedElements = [component];
        const index = state.elements.indexOf(component);
        if (index > -1) {
            state.elements.splice(index, 1);
            state.elements.push(component);
        }
    }
}

export function selectAll(state: EditorState, render: () => void): void {
    clearSelection(state);
    for (const component of state.elements) {
        component.selected = true;
        state.selectedElements.push(component);
    }
    render();
}

export function selectConnection(state: EditorState, connection: Connection | null): void {
    if (state.selectedConnection) {
        state.selectedConnection.selected = false;
    }
    state.selectedConnection = connection;
    if (connection) {
        connection.selected = true;
    }
}

export function alignSelectedElementsVertically(state: EditorState, saveState: () => void, saveToStorage: () => void, render: () => void): void {
    if (state.selectedElements.length < 2) return;
    saveState();

    let totalCenterY = 0;
    for (const el of state.selectedElements) {
        totalCenterY += el.y + el.height / 2;
    }
    const avgCenterY = totalCenterY / state.selectedElements.length;

    for (const el of state.selectedElements) {
        el.y = avgCenterY - el.height / 2;
    }

    render();
    saveToStorage();
}

export function alignSelectedElementsHorizontally(state: EditorState, saveState: () => void, saveToStorage: () => void, render: () => void): void {
    if (state.selectedElements.length < 2) return;
    saveState();

    let totalCenterX = 0;
    for (const el of state.selectedElements) {
        totalCenterX += el.x + el.width / 2;
    }
    const avgCenterX = totalCenterX / state.selectedElements.length;

    for (const el of state.selectedElements) {
        el.x = avgCenterX - el.width / 2;
    }

    render();
    saveToStorage();
}

export function getSortedComponentsForRendering(state: EditorState): DiagramElement[] {
    const systems: DiagramElement[] = [];
    const domains: DiagramElement[] = [];
    const modules: DiagramElement[] = [];
    const others: DiagramElement[] = [];
    const boundaries: DiagramElement[] = [];
    const numberedDots: DiagramElement[] = [];

    for (const comp of state.elements) {
        if (comp instanceof NumberedDot || comp instanceof Tag) {
            numberedDots.push(comp);
        } else if (comp instanceof Boundary) {
            boundaries.push(comp);
        } else if (comp instanceof System) {
            systems.push(comp);
        } else if (comp instanceof Domain) {
            domains.push(comp);
        } else if (comp instanceof Module) {
            modules.push(comp);
        } else {
            others.push(comp);
        }
    }

    return [...systems, ...domains, ...modules, ...others, ...boundaries, ...numberedDots];
}

export function isPointCoveredByHigherComponent(state: EditorState, point: Point, component: DiagramElement): boolean {
    const sortedComponents = getSortedComponentsForRendering(state);
    const componentIndex = sortedComponents.indexOf(component);

    for (let i = componentIndex + 1; i < sortedComponents.length; i++) {
        const higherComponent = sortedComponents[i];
        if (higherComponent && higherComponent.containsPoint(point.x, point.y)) {
            return true;
        }
    }

    return false;
}
