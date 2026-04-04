/**
 * Canvas Drawing Library for Architecture Diagrams
 * Re-exports all elements for backward compatibility
 */
export * from './types';
export * from './constants';
export { CanvasRenderer } from './renderer';
export { ShapeDrawer } from './shape-drawer';
export { DiagramElement } from './diagramElement';
export { ContainerElement } from './containerElement';
export { Component } from './component';
export { User } from './user';
export { Module } from './module';
export { Domain } from './domain';
export { System } from './system';
export { Boundary } from './boundary';
export { Note } from './note';
export { NumberedDot } from './numberedDot';
export { Label } from './label';
export { Tag } from './tag';
export { Port, PORT_SIZE, PORT_SNAP_THRESHOLD } from './port';
export { Connection, getControlPoint, controlDistance, distance } from './connection';
export { IconCache, iconCache, TABLER_ICONS, getAvailableIcons, preloadIcons } from './iconCache';
export { ElementRegistry, elementRegistry } from './registry';
