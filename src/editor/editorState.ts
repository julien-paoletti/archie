/**
 * Editor State
 * Shared mutable state for all editor modules
 */

import type {
    CanvasRenderer,
    Connection,
    DiagramElement,
    Domain,
    Module,
    System,
    Point
} from '../canvas/index';
import type { InteractionMode } from './interactionMode';
import { isDragOperation as isDragOperationMode } from './interactionMode';

export interface HoverConnectionPoint {
    point: Point;
    side: 'top' | 'right' | 'bottom' | 'left';
    offset: number;
    componentId: string;
}

export interface EditorState {
    // Core
    canvas: HTMLCanvasElement;
    container: HTMLElement;
    canvasWorld: HTMLElement;
    renderer: CanvasRenderer;
    ctx: CanvasRenderingContext2D;
    elements: DiagramElement[];
    connections: Connection[];
    selectedElements: DiagramElement[];
    selectedConnection: Connection | null;
    hoveredElement: DiagramElement | null;

    // World
    worldWidth: number;
    worldHeight: number;
    gridSize: number;
    snapToGrid: boolean;

    // The single active interaction. Replaces the old flag soup + companion
    // fields; each mode variant carries its own data. See interactionMode.ts.
    mode: InteractionMode;

    // Connection point currently hovered (transient, independent of mode)
    hoverConnectionPoint: HoverConnectionPoint | null;

    // Container drop
    potentialDropTarget: Module | Domain | System | null;

    // Viewport
    scale: number;
    panOffset: Point;
    isPanning: boolean;
    panStart: Point;
    isSpacePressed: boolean;

    // Auto-scroll
    autoScrollAnimationId: number | null;
    lastScreenMousePos: Point;

    // Crosshair
    mousePos: Point | null;
    showCrosshair: boolean;

    // Dot counter
    nextDotNumber: number;

    // Minimap
    minimapCanvas: HTMLCanvasElement | null;
    minimapCtx: CanvasRenderingContext2D | null;
    minimapContainer: HTMLElement | null;
    isDraggingMinimap: boolean;
}

/**
 * The three side-effect callbacks that nearly every mutating handler needs:
 * push an undo snapshot, persist to storage, and repaint. Bundled into one
 * object so handler signatures stay readable instead of threading three
 * separate closures through every call.
 */
export interface EditorContext {
    saveState: () => void;
    saveToStorage: () => void;
    render: () => void;
}

// Helpers
export function isDragOperation(state: EditorState): boolean {
    return isDragOperationMode(state.mode);
}

// Constants
export const EDGE_THRESHOLD = 50;
export const EXTEND_AMOUNT = 200;
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const ZOOM_SENSITIVITY = 0.001;
export const AUTO_SCROLL_EDGE_MARGIN = 50;
export const AUTO_SCROLL_SPEED = 10;
export const MAX_HISTORY_SIZE = 50;
