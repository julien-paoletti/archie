/**
 * Editor Module
 * Thin coordinator that wires together all editor handler modules
 */

import {
    CanvasRenderer,
    Component,
    Connection,
    Label,
    Module,
    Note,
    NumberedDot,
    Port,
    PORT_SIZE,
    Tag,
    type DiagramElement
} from './canvas/index';

import type { EditorOptions, SerializedComponent, SerializedDiagram } from './editor/editorTypes';
import type { ClipboardData } from './editor/clipboardHandler';
import type { EditorContext, EditorState } from './editor/editorState';
import { IDLE } from './editor/interactionMode';

import { ContextMenuHandler } from './editor/contextMenuHandler';
import { InlineEditController } from './editor/inlineEditController';
import { SerializationManager, type SerializationState } from './editor/serializationManager';

import * as viewport from './editor/viewportHandler';
import * as selection from './editor/selectionHandler';
import * as connection from './editor/connectionInteractionHandler';
import * as mouse from './editor/mouseHandler';
import * as mouseMove from './editor/mouseMoveHandler';
import * as keyboard from './editor/keyboardHandler';
import * as dragDrop from './editor/dragDropHandler';
import * as rendering from './editor/renderingHandler';
import * as clipboard from './editor/clipboardHandler';
import * as minimap from './editor/minimapHandler';

// Re-export types for backward compatibility
export type { EditorOptions } from './editor/editorTypes';

export class Editor {
    private state: EditorState;
    private ctx: EditorContext;
    // Silent context for batched mutations that snapshot/persist/render once at the end.
    private readonly noopCtx: EditorContext = { saveState: () => {}, saveToStorage: () => {}, render: () => {} };
    private contextMenuHandler: ContextMenuHandler;
    private inlineEditController: InlineEditController;
    private serializationManager: SerializationManager;
    private clipboardData: ClipboardData = { elements: [], connections: [] };

    constructor(canvasId: string, options: EditorOptions = {}) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!canvas) throw new Error(`Canvas element with id "${canvasId}" not found`);

        const container = document.getElementById('editor-container');
        const canvasWorld = document.getElementById('canvas-world');
        if (!container || !canvasWorld) throw new Error('Editor container or canvas-world element not found');

        const renderer = new CanvasRenderer(canvas);
        const containerRect = container.getBoundingClientRect();

        this.state = {
            canvas,
            container,
            canvasWorld,
            renderer,
            ctx: renderer.ctx,
            elements: [],
            connections: [],
            selectedElements: [],
            selectedConnection: null,
            hoveredElement: null,
            worldWidth: containerRect.width,
            worldHeight: containerRect.height,
            gridSize: options.gridSize ?? 24,
            snapToGrid: options.snapToGrid !== false,
            mode: IDLE,
            hoverConnectionPoint: null,
            potentialDropTarget: null,
            scale: 1,
            panOffset: { x: 0, y: 0 },
            isPanning: false,
            panStart: { x: 0, y: 0 },
            isSpacePressed: false,
            autoScrollAnimationId: null,
            lastScreenMousePos: { x: 0, y: 0 },
            mousePos: null,
            showCrosshair: true,
            nextDotNumber: 1,
            minimapCanvas: null,
            minimapCtx: null,
            minimapContainer: null,
            isDraggingMinimap: false
        };

        this.ctx = {
            saveState: () => this.saveState(),
            saveToStorage: () => this.saveToStorage(),
            render: () => this.render()
        };

        this.contextMenuHandler = this.createContextMenuHandler();
        this.inlineEditController = this.createInlineEditController();
        this.serializationManager = this.createSerializationManager();

        this.init();
    }

    private createContextMenuHandler(): ContextMenuHandler {
        return new ContextMenuHandler('context-menu', {
            startTitleEdit: (el) => this.inlineEditController.startTitleEdit(el),
            startConnectionLabelEdit: (conn) => this.inlineEditController.startConnectionLabelEdit(conn),
            startDescriptionEdit: (comp) => this.inlineEditController.startDescriptionEdit(comp),
            addIntermediateAnchor: (conn, pos) => connection.addIntermediateAnchor(this.state, conn, pos, this.ctx),
            removeIntermediateAnchor: (conn, idx) => connection.removeIntermediateAnchor(this.state, conn, idx, this.ctx),
            resetConnectionCurve: (conn) => connection.resetConnectionCurve(this.state, conn, this.ctx),
            reverseConnection: (conn) => {
                this.saveState();
                conn.reverse();
                this.saveToStorage();
                this.render();
            },
            removeConnection: (conn) => connection.removeConnection(this.state, conn, this.ctx),
            changeBorderColor: (el, color) => {
                this.saveState();
                if (el instanceof Port) {
                    el.portColor = color;
                } else {
                    (el as any).borderColor = color;
                }
                this.saveToStorage();
                this.render();
            },
            changeNoteIcon: (note, icon) => {
                this.saveState();
                note.noteIcon = icon;
                this.saveToStorage();
                this.render();
            },
            changeNoteIconPosition: (note, position) => {
                this.saveState();
                note.noteIconPosition = position as any;
                this.saveToStorage();
                this.render();
            },
            changeNoteColor: (note, bgColor, textColor, accentColor, borderColor) => {
                this.saveState();
                note.backgroundColor = bgColor;
                note.textColor = textColor;
                note.accentColor = accentColor;
                note.borderColor = borderColor;
                this.saveToStorage();
                this.render();
            },
            changeTagColor: (tag, bgColor, textColor) => {
                this.saveState();
                tag.backgroundColor = bgColor;
                tag.textColor = textColor;
                this.saveToStorage();
                this.render();
            },
            changeConnectionStrokeColor: (conn, color) => {
                this.saveState();
                conn.strokeColor = color;
                this.saveToStorage();
                this.render();
            },
            changeConnectionLineStyle: (conn, style) => {
                this.saveState();
                conn.lineStyle = style;
                this.saveToStorage();
                this.render();
            },
            changeConnectionArrowType: (conn, type) => {
                this.saveState();
                conn.arrowType = type;
                this.saveToStorage();
                this.render();
            },
            toggleConnectionSourceArrow: (conn) => {
                this.saveState();
                conn.sourceArrowType = conn.sourceArrowType !== 'none' ? 'none' : conn.arrowType === 'none' ? 'filled' : conn.arrowType;
                this.saveToStorage();
                this.render();
            },
            changeConnectionCurveType: (conn, curveType) => {
                this.saveState();
                conn.curveType = curveType;
                this.saveToStorage();
                this.render();
            },
            changeFontSize: (el, delta) => {
                this.saveState();
                el.fontSize = Math.min(72, Math.max(8, el.fontSize + delta));
                this.saveToStorage();
                this.render();
            },
            changeBoundaryLabelPosition: (el, position) => {
                this.saveState();
                el.labelPosition = position as any;
                this.saveToStorage();
                this.render();
            },
            startPortNumberEdit: (port) => this.inlineEditController.startPortNumberEdit(port),
            alignSelectedVertically: () => selection.alignSelectedElementsVertically(this.state, this.ctx),
            alignSelectedHorizontally: () => selection.alignSelectedElementsHorizontally(this.state, this.ctx),
            groupSelectedIntoModule: () => dragDrop.groupIntoModule(this.state, this.ctx),
            getSelectedElements: () => this.state.selectedElements,
            getElements: () => this.state.elements,
            addPortToConnection: (conn, end) => this.addPortToConnection(conn, end),
            removeElement: (el) => dragDrop.removeComponent(this.state, el, this.ctx)
        });
    }

    private createInlineEditController(): InlineEditController {
        return new InlineEditController({
            render: () => this.render(),
            saveState: () => this.saveState(),
            saveToStorage: () => this.saveToStorage(),
            worldToScreen: (x, y) => viewport.worldToScreen(this.state, x, y),
            getScale: () => this.state.scale,
            getCanvasRect: () => this.state.canvas.getBoundingClientRect(),
            getMidpoint: (conn) => conn.getMidpoint(this.state.elements)
        });
    }

    private createSerializationManager(): SerializationManager {
        // elements/connections/panOffset are exposed as live getters onto the
        // editor's own state, so the manager always reads the current arrays.
        // (Previously these were copied by reference at construction and could
        // desync if the editor reassigned an array — the cause of connections
        // silently not being saved.)
        const editorState = this.state;
        const serState: SerializationState = {
            get elements() { return editorState.elements; },
            get connections() { return editorState.connections; },
            historyStack: [],
            redoStack: [],
            clipboard: [],
            get nextDotNumber() { return editorState.nextDotNumber; },
            set nextDotNumber(v: number) { editorState.nextDotNumber = v; },
            get panOffset() { return editorState.panOffset; }
        };
        return new SerializationManager(serState, {
            clearAll: () => this.clearAll(),
            render: () => this.render(),
            updateWorldSize: () => viewport.updateWorldSize(this.state),
            getScale: () => this.state.scale,
            setScale: (scale: number) => { this.state.scale = scale; }
        });
    }

    private init(): void {
        this.setupEventListeners();
        this.serializationManager.loadFromStorage();
        viewport.updateWorldSize(this.state);
        minimap.initMinimap(this.state);
        minimap.setupMinimapEvents(this.state, {
            render: () => this.render(),
            saveToStorage: () => this.saveToStorage()
        });
        this.render();
    }

    private setupEventListeners(): void {
        const s = this.state;
        const cb: mouse.MouseHandlerCallbacks = {
            render: () => this.render(),
            saveState: () => this.saveState(),
            saveToStorage: () => this.saveToStorage()
        };

        window.addEventListener('resize', () => { viewport.updateWorldSize(s); this.render(); });

        s.canvas.addEventListener('mousedown', (e) => mouse.handleMouseDown(s, e, cb));
        s.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        s.canvas.addEventListener('mouseup', () => mouse.handleMouseUp(s, cb));
        s.canvas.addEventListener('mouseleave', () => mouse.handleMouseLeave(s, () => this.render()));
        s.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        document.addEventListener('mousemove', (e) => mouse.handleDocumentMouseMove(s, e, () => this.startAutoScrollWrapper()));
        document.addEventListener('mouseup', () => mouse.handleDocumentMouseUp(s, cb));

        s.canvas.addEventListener('wheel', (e) => viewport.handleWheel(s, e, () => this.render(), () => this.saveToStorage()), { passive: false });

        window.addEventListener('keydown', (e) => keyboard.handleKeyDown(s, e));
        window.addEventListener('keyup', (e) => keyboard.handleKeyUp(s, e));

        s.canvas.addEventListener('dragover', (e) => dragDrop.handleDragOver(e));
        s.canvas.addEventListener('drop', (e) => dragDrop.handleDrop(s, e, this.ctx));
        s.canvas.addEventListener('dragleave', () => dragDrop.handleDragLeave());

        s.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }

    private onMouseMove(e: MouseEvent): void {
        mouseMove.handleMouseMove(
            this.state, e, () => this.render(),
            (x, y, ex) => selection.findContainerAtPoint(this.state, x, y, ex),
            (x, y, ex) => selection.findDomainAtPoint(this.state, x, y, ex),
            (x, y, ex) => selection.findSystemAtPoint(this.state, x, y, ex)
        );
    }

    private startAutoScrollWrapper(): void {
        viewport.startAutoScroll(
            this.state, () => this.render(),
            (x, y, ex) => selection.findContainerAtPoint(this.state, x, y, ex),
            (x, y, ex) => selection.findDomainAtPoint(this.state, x, y, ex),
            (x, y, ex) => selection.findSystemAtPoint(this.state, x, y, ex)
        );
    }

    private handleContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const rect = this.state.canvas.getBoundingClientRect();
        const pos = viewport.screenToWorld(this.state, e.clientX - rect.left, e.clientY - rect.top);

        this.contextMenuHandler.setClickPos(pos);
        this.contextMenuHandler.setAnchorIndex(null);

        const clickedElement = selection.findComponentAtPoint(this.state, pos.x, pos.y);

        // Port takes priority over connections that pass through it
        if (!(clickedElement instanceof Port)) {
            const clickedConnection = this.state.connections.find(conn =>
                conn.containsPoint(pos.x, pos.y, this.state.elements, 15)
            );
            if (clickedConnection) {
                if (clickedConnection.selected) {
                    const anchorIdx = clickedConnection.getIntermediateAnchorAtPosition(pos.x, pos.y, 12);
                    if (anchorIdx !== null) this.contextMenuHandler.setAnchorIndex(anchorIdx);
                }
                this.contextMenuHandler.show(e.clientX, e.clientY, clickedConnection);
                return;
            }
        }
        if (clickedElement) {
            this.contextMenuHandler.show(e.clientX, e.clientY, clickedElement);
            return;
        }

        this.contextMenuHandler.hide();
    }

    private handleDoubleClick(e: MouseEvent): void {
        const pos = viewport.getMousePosition(this.state, e);

        const conn = selection.findConnectionAtPoint(this.state, pos.x, pos.y);
        if (conn) { this.inlineEditController.startConnectionLabelEdit(conn); return; }

        const component = selection.findComponentAtPoint(this.state, pos.x, pos.y);
        if (!component) return;

        if (component instanceof Note) this.inlineEditController.startNoteEdit(component);
        else if (component instanceof Label) this.inlineEditController.startLabelEdit(component);
        else if (component instanceof NumberedDot) this.inlineEditController.startNumberEdit(component);
        else if (component instanceof Tag) this.inlineEditController.startTagEdit(component);
        else if ((component instanceof Component || component instanceof Module) && component.isPointInDescriptionArea(pos.x, pos.y)) this.inlineEditController.startDescriptionEdit(component);
        else this.inlineEditController.startTitleEdit(component);
    }

    // Convenience methods
    private render(): void {
        rendering.render(this.state);
        this.inlineEditController.updatePositions();
        minimap.renderMinimap(this.state);
    }
    private saveToStorage(): void { this.serializationManager.saveToStorage(); }

    // Public API
    createElement(type: string, x: number, y: number): DiagramElement | null {
        return dragDrop.createElement(this.state, type, x, y, this.ctx);
    }
    addElement(component: DiagramElement): void {
        dragDrop.addElement(this.state, component, this.ctx);
    }
    removeComponent(component: DiagramElement): void {
        dragDrop.removeComponent(this.state, component, this.ctx);
    }
    removeComponents(components: DiagramElement[]): void {
        if (components.length === 0) return;
        this.saveState();
        for (const component of components) {
            dragDrop.removeComponent(this.state, component, this.noopCtx);
        }
        this.saveToStorage();
        this.render();
    }

    clearSelection(): void { selection.clearSelection(this.state); }
    selectElement(component: DiagramElement | null): void { selection.selectElement(this.state, component); }
    selectAll(): void { selection.selectAll(this.state, () => this.render()); }
    selectConnection(conn: Connection | null): void { selection.selectConnection(this.state, conn); }
    getSelectedConnection(): Connection | null { return this.state.selectedConnection; }
    removeConnection(conn: Connection): void {
        connection.removeConnection(this.state, conn, this.ctx);
    }

    private addPortToConnection(conn: Connection, end: 'source' | 'target'): void {
        const point = end === 'source' ? conn.sourcePoint : conn.targetPoint;
        const host = this.state.elements.find(e => e.id === point.componentId);
        if (!host) return;

        this.saveState();

        const borderPt = host.getPointOnBorder(point.side, point.offset);
        const port = new Port({
            x: borderPt.x - PORT_SIZE / 2,
            y: borderPt.y - PORT_SIZE / 2,
            title: '',
            snappedToId: host.id,
            snappedSide: point.side,
            snappedOffset: point.offset,
        });
        this.state.elements.push(port);

        const newPoint = {
            x: borderPt.x,
            y: borderPt.y,
            componentId: port.id,
            side: point.side,
            offset: 0.5
        };
        if (end === 'source') {
            conn.sourcePoint = newPoint;
        } else {
            conn.targetPoint = newPoint;
        }

        this.saveToStorage();
        this.render();
    }

    getComponents(): DiagramElement[] { return [...this.state.elements]; }
    getConnections(): Connection[] { return [...this.state.connections]; }
    getSelectedComponent(): DiagramElement | null { return this.state.selectedElements.length === 1 ? this.state.selectedElements[0]! : null; }
    getSelectedComponents(): DiagramElement[] { return [...this.state.selectedElements]; }

    clearAll(): void {
        this.state.elements.length = 0;
        this.state.connections.length = 0;
        this.state.selectedElements.length = 0;
        this.state.hoveredElement = null;
        this.state.nextDotNumber = 1;
        this.render();
        this.saveToStorage();
    }

    toJSON(): SerializedDiagram { return this.serializationManager.toJSON(); }
    fromJSON(data: SerializedDiagram | SerializedComponent[]): void { this.serializationManager.fromJSON(data); }
    clearStorage(): void { this.serializationManager.clearStorage(); }

    saveState(): void { this.serializationManager.saveState(); }
    undo(): boolean { return this.serializationManager.undo(); }
    redo(): boolean { return this.serializationManager.redo(); }
    canUndo(): boolean { return this.serializationManager.canUndo(); }
    canRedo(): boolean { return this.serializationManager.canRedo(); }

    copy(): boolean { return clipboard.copy(this.state, this.clipboardData); }
    cut(): boolean {
        if (!this.copy()) return false;
        this.saveState();
        const toRemove = [...this.state.selectedElements];
        for (const el of toRemove) {
            dragDrop.removeComponent(this.state, el, this.noopCtx);
        }
        this.saveToStorage();
        this.render();
        return true;
    }
    paste(): boolean { return clipboard.paste(this.state, this.clipboardData, this.ctx); }
    canPaste(): boolean { return this.clipboardData.elements.length > 0; }
    exportPNG(): void { clipboard.exportPNG(this.state); }
    copyPNG(onDone: (err?: Error) => void): void { clipboard.copyPNG(this.state, onDone); }
}
