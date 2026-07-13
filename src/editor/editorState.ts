/**
 * Editor State
 * Shared mutable state for all editor modules
 */

import type {
    CanvasRenderer,
    Connection,
    ConnectionPoint,
    DiagramElement,
    Domain,
    Module,
    System,
    Point,
    ResizeHandle
} from '../canvas/index';

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

    // Drag
    isDragging: boolean;
    dragOffset: Point;
    draggedComponent: DiagramElement | null;
    dragStartPos: Point | null;
    isCloneDrag: boolean;

    // Resize
    isResizing: boolean;
    resizeHandle: ResizeHandle;
    resizeStartPos: Point;
    resizeStartBounds: { x: number; y: number; width: number; height: number };

    // Connection creation
    isConnecting: boolean;
    sourceConnectionPoint: ConnectionPoint | null;
    connectionDragStartPos: Point | null;
    hoverConnectionPoint: HoverConnectionPoint | null;

    // Connection point dragging
    isDraggingConnectionPoint: boolean;
    draggedConnection: Connection | null;
    draggedConnectionEnd: 'source' | 'target' | null;

    // Control point dragging
    isDraggingControlPoint: boolean;
    draggedControlConnection: Connection | null;
    draggedControlPointType: 'source' | 'target' | null;

    // Connection slide
    isDraggingConnectionSlide: boolean;
    slideConnection: Connection | null;
    slideStartY: number;
    slideSourceStart: ConnectionPoint | null;
    slideTargetStart: ConnectionPoint | null;

    // Intermediate anchors
    isDraggingIntermediateAnchor: boolean;
    isDraggingIntermediateHandle: boolean;
    draggedAnchorConnection: Connection | null;
    draggedAnchorIndex: number | null;
    draggedHandleType: 'in' | 'out' | null;

    // Box selection
    isBoxSelecting: boolean;
    boxSelectStart: Point | null;
    boxSelectCurrent: Point | null;

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
    return state.isDragging || state.isBoxSelecting || state.isConnecting ||
        state.isDraggingConnectionPoint || state.isDraggingControlPoint ||
        state.isDraggingIntermediateAnchor || state.isDraggingIntermediateHandle ||
        state.isDraggingConnectionSlide;
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
