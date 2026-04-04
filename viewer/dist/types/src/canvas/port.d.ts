/**
 * Port Element
 * A small interface/port marker that can be placed on element borders.
 * Displays an optional port number and a name label.
 */
import { DiagramElement } from './diagramElement';
import type { DiagramElementOptions } from './types';
export declare const PORT_SIZE = 22;
export declare const PORT_SNAP_THRESHOLD = 20;
export interface PortOptions extends DiagramElementOptions {
    portNumber?: number | null;
    portColor?: string;
    snappedToId?: string | null;
    snappedSide?: 'top' | 'right' | 'bottom' | 'left' | null;
    snappedOffset?: number | null;
}
export declare class Port extends DiagramElement {
    portNumber: number | null;
    portColor: string;
    snappedToId: string | null;
    snappedSide: 'top' | 'right' | 'bottom' | 'left' | null;
    snappedOffset: number | null;
    constructor(options?: PortOptions);
    draw(ctx: CanvasRenderingContext2D): void;
    containsPoint(px: number, py: number): boolean;
    getResizeHandleAtPoint(): null;
    resize(): void;
    getNearestBorderPoint(px: number, py: number, threshold?: number): {
        point: {
            x: number;
            y: number;
        };
        side: 'top' | 'right' | 'bottom' | 'left';
        offset: number;
    } | null;
    clone(): Port;
    static get type(): string;
    static get displayName(): string;
    static createDefault(): Port;
}
