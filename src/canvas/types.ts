/**
 * Types and Interfaces for Canvas Drawing Library
 */

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Bounds extends Point, Size { }

export type ResizeHandle =
    | 'top-left' | 'top' | 'top-right'
    | 'left' | 'right'
    | 'bottom-left' | 'bottom' | 'bottom-right'
    | null;

export interface ColorStop {
    offset: number;
    color: string;
}

export interface ShadowOptions {
    color?: string;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
}

export interface TextOptions {
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    maxWidth?: number;
}

export interface DiagramElementOptions {
    id?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    title?: string;
    parentId?: string | null;
}

export interface ConnectionPoint {
    x: number;
    y: number;
    componentId: string;
    side: 'top' | 'right' | 'bottom' | 'left';
    offset: number; // 0-1 position along the side
}

export interface IntermediateAnchor {
    position: Point; // Where the anchor point is located
    handleIn: Point; // Control point for the segment coming into this anchor
    handleOut: Point; // Control point for the segment going out of this anchor
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowType = 'filled' | 'outline' | 'line' | 'none';
export type CurveType = 'bezier' | 'catmull-rom';

export interface ConnectionOptions {
    id?: string;
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

export interface ElementOptions extends DiagramElementOptions {
    borderRadius?: number;
    gradientColors?: ColorStop[];
    shadowOptions?: ShadowOptions;
    borderColor?: string;
    borderWidth?: number;
    titleColor?: string;
    titleFont?: string;
    icon?: string;       // Lucide icon name
    iconColor?: string;  // Icon stroke color
    description?: string; // Optional short description
}


export interface DomainOptions extends DiagramElementOptions {
    borderRadius?: number;
    gradientColors?: ColorStop[];
    shadowOptions?: ShadowOptions;
    borderColor?: string;
    borderWidth?: number;
    titleColor?: string;
    titleFont?: string;
    padding?: number;
    childIds?: string[];
}

export type LabelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Where a container (Module/Domain/System) places its title + description band. */
export type TitlePosition = 'top' | 'bottom';

export interface BoundaryOptions extends DiagramElementOptions {
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    labelColor?: string;
    labelFont?: string;
    backgroundColor?: string;
    labelPosition?: LabelPosition;
}

// Forward reference for DiagramElement
export type { DiagramElement } from './diagramElement';

// Using a more flexible type to accommodate subclass-specific options
export interface ElementConstructor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new(options?: any): import('./diagramElement').DiagramElement;
    readonly type: string;
    readonly displayName: string;
    createDefault(): import('./diagramElement').DiagramElement;
}
