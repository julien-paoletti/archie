/**
 * Connection Math Utilities
 * Bezier curve calculations, control points, and geometry helpers
 */
import type { Point } from '../types';
export declare function getControlPoint(point: Point, side: string, distance: number): Point;
export declare function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point;
export declare function lerp(p0: Point, p1: Point, t: number): Point;
export declare function distance(x1: number, y1: number, x2: number, y2: number): number;
export declare function controlDistance(p1: Point, p2: Point): number;
export declare function splitCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): {
    segment1: {
        start: Point;
        control1: Point;
        control2: Point;
        end: Point;
    };
    segment2: {
        start: Point;
        control1: Point;
        control2: Point;
        end: Point;
    };
};
export declare function findClosestPointOnCurve(clickPos: Point, p0: Point, p1: Point, p2: Point, p3: Point): {
    t: number;
    point: Point;
};
