/**
 * Editor Types
 * Type definitions for the diagram editor
 */

import type { ArrowType, ConnectionPoint, CurveType, IntermediateAnchor, LineStyle, Point } from '../canvas/index';

export interface EditorOptions {
    gridSize?: number;
    snapToGrid?: boolean;
}

export interface DragData {
    type: string;
    action: 'create';
}

export interface SerializedComponent {
    type: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    parentId?: string | null;
    icon?: string;
    iconColor?: string;
    description?: string;
    text?: string;
    number?: number;
    labelPosition?: string;
    titlePosition?: string;
    fontSize?: number;
    borderColor?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    noteBorderColor?: string;
    noteIcon?: string;
    noteIconPosition?: string;
    portNumber?: number | null;
    portColor?: string;
    snappedToId?: string | null;
    snappedSide?: string | null;
    snappedOffset?: number | null;
}

export interface SerializedConnection {
    id: string;
    sourcePoint: ConnectionPoint;
    targetPoint: ConnectionPoint;
    strokeColor?: string;
    strokeWidth?: number;
    label?: string;
    lineStyle?: LineStyle;
    arrowType?: ArrowType;
    sourceArrowType?: ArrowType;
    curveType?: CurveType;
    customControlPoint1?: Point;
    customControlPoint2?: Point;
    intermediateAnchors?: IntermediateAnchor[];
}

export interface SerializedViewport {
    scale: number;
    panX: number;
    panY: number;
}

export interface SerializedDiagram {
    components: SerializedComponent[];
    connections: SerializedConnection[];
    viewport?: SerializedViewport;
}
