/**
 * Connection Class
 * Represents a connection between two diagram components
 */
import type { DiagramElement } from '../diagramElement';
import type { ConnectionOptions, ConnectionPoint, Point, IntermediateAnchor, LineStyle, ArrowType, CurveType } from '../types';
export declare class Connection {
    id: string;
    sourcePoint: ConnectionPoint;
    targetPoint: ConnectionPoint;
    strokeColor: string;
    strokeWidth: number;
    selected: boolean;
    label: string;
    hideLabel: boolean;
    lineStyle: LineStyle;
    arrowType: ArrowType;
    curveType: CurveType;
    customControlPoint1: Point | null;
    customControlPoint2: Point | null;
    intermediateAnchors: IntermediateAnchor[];
    constructor(options: ConnectionOptions);
    private getLineDash;
    private getActualControlPoints;
    private resolveEndpoints;
    private getMultiSegmentHandles;
    draw(ctx: CanvasRenderingContext2D, components: DiagramElement[]): void;
    getMidpoint(components: DiagramElement[]): Point | null;
    getControlPointAtPosition(px: number, py: number, components: DiagramElement[], threshold?: number): 'source' | 'target' | null;
    getIntermediateAnchorAtPosition(px: number, py: number, threshold?: number): number | null;
    getIntermediateAnchorHandleAtPosition(px: number, py: number, threshold?: number): {
        anchorIndex: number;
        handleType: 'in' | 'out';
    } | null;
    containsPoint(px: number, py: number, components: DiagramElement[], threshold?: number): boolean;
    addIntermediateAnchor(clickPos: Point, components: DiagramElement[]): void;
    reverse(): void;
    toJSON(): ConnectionOptions;
}
