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
export interface Bounds extends Point, Size {
}
export type ResizeHandle = 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right' | null;
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
    offset: number;
}
export interface IntermediateAnchor {
    position: Point;
    handleIn: Point;
    handleOut: Point;
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
    icon?: string;
    iconColor?: string;
    description?: string;
}
export interface ModuleOptions extends DiagramElementOptions {
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
export interface BoundaryOptions extends DiagramElementOptions {
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    labelColor?: string;
    labelFont?: string;
    backgroundColor?: string;
    labelPosition?: LabelPosition;
}
export type { DiagramElement } from './diagramElement';
export interface ElementConstructor {
    new (options?: any): import('./diagramElement').DiagramElement;
    readonly type: string;
    readonly displayName: string;
    createDefault(): import('./diagramElement').DiagramElement;
}
