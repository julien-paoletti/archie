/**
 * Cursor Utilities
 * Helper functions for managing canvas cursor states
 */

export type CursorType =
    | 'default'
    | 'pointer'
    | 'grab'
    | 'grabbing'
    | 'move'
    | 'crosshair'
    | 'text'
    | 'copy'
    | 'not-allowed'
    | 'nwse-resize'
    | 'nesw-resize'
    | 'ns-resize'
    | 'ew-resize';

/**
 * Set the cursor style on a canvas element
 */
export function setCursor(canvas: HTMLCanvasElement, cursor: CursorType): void {
    canvas.style.cursor = cursor;
}

/**
 * Get the appropriate cursor for a resize handle
 */
export function getResizeCursor(handle: string | null): CursorType {
    switch (handle) {
        case 'top-left':
        case 'bottom-right':
            return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
            return 'nesw-resize';
        case 'top':
        case 'bottom':
            return 'ns-resize';
        case 'left':
        case 'right':
            return 'ew-resize';
        default:
            return 'default';
    }
}

/**
 * Cursor state manager for handling complex cursor logic
 */
export class CursorManager {
    private canvas: HTMLCanvasElement;
    private currentCursor: CursorType = 'default';
    private overrideCursor: CursorType | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    /**
     * Set a temporary override cursor (e.g., during drag operations)
     */
    setOverride(cursor: CursorType): void {
        this.overrideCursor = cursor;
        this.apply();
    }

    /**
     * Clear the override cursor
     */
    clearOverride(): void {
        this.overrideCursor = null;
        this.apply();
    }

    /**
     * Set the normal cursor (will be overridden if an override is active)
     */
    set(cursor: CursorType): void {
        this.currentCursor = cursor;
        this.apply();
    }

    /**
     * Reset to default cursor
     */
    reset(): void {
        this.currentCursor = 'default';
        this.overrideCursor = null;
        this.apply();
    }

    /**
     * Apply the current cursor state to the canvas
     */
    private apply(): void {
        const cursor = this.overrideCursor ?? this.currentCursor;
        this.canvas.style.cursor = cursor;
    }

    /**
     * Get the current effective cursor
     */
    get current(): CursorType {
        return this.overrideCursor ?? this.currentCursor;
    }
}
