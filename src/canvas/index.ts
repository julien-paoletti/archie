/**
 * Canvas Drawing Library for Architecture Diagrams
 * Re-exports all elements for backward compatibility
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Core classes
export { CanvasRenderer } from './renderer';
export { ShapeDrawer } from './shape-drawer';
export { DiagramElement } from './diagramElement';
export { ContainerElement } from './containerElement';

// Elements
export { Component } from './component';
export { User } from './user';
export { Module, type ModuleOptions } from './module';
export { Domain } from './domain';
export { System } from './system';
export { Boundary } from './boundary';
export { Note } from './note';
export { NumberedDot } from './numberedDot';
export { Label } from './label';
export { Tag } from './tag';
export { Port, PORT_SIZE, PORT_SNAP_THRESHOLD } from './port';

// Connections
export { Connection, getControlPoint, controlDistance, distance } from './connection';

// Icons
export { IconCache, iconCache, TABLER_ICONS, NOTE_ICONS, getAvailableIcons, preloadIcons } from './iconCache';

// Registry
export { ElementRegistry, elementRegistry } from './registry';

// Register default components
import { elementRegistry } from './registry';
import { Component } from './component';
import { User } from './user';
import { Module } from './module';
import { Domain } from './domain';
import { System } from './system';
import { Boundary } from './boundary';
import { Note } from './note';
import { NumberedDot } from './numberedDot';
import { Label } from './label';
import { Tag } from './tag';
import { Port } from './port';

elementRegistry.register(Component);
elementRegistry.register(Module);
elementRegistry.register(Domain);
elementRegistry.register(System);
elementRegistry.register(Boundary);
elementRegistry.register(User);
elementRegistry.register(Note);
elementRegistry.register(NumberedDot);
elementRegistry.register(Label);
elementRegistry.register(Tag);
elementRegistry.register(Port);
