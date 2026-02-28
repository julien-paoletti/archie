/**
 * Connection Module
 * Re-exports all connection-related functionality
 */

export { Connection } from './connection';
export { getControlPoint, getBezierPoint, lerp, distance, controlDistance, splitCubicBezier, findClosestPointOnCurve } from './connectionMath';
export { drawSingleSegment, drawMultiSegment, drawCatmullRomConnection } from './connectionRenderer';
export { containsPointOnCurve, containsPointOnMultiSegment, containsPointOnSegments, findControlPointAtPosition, findAnchorAtPosition, findAnchorHandleAtPosition } from './connectionHitDetection';
export { catmullRomToBezierControls, buildCatmullRomPointChain, catmullRomSegments } from './catmullRomMath';
export type { BezierSegment } from './catmullRomMath';
