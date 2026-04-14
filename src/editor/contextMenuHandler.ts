/**
 * Context Menu Handler
 * Manages context menu display and actions for diagram elements and connections
 */

import type { DiagramElement, Connection, Point, LineStyle, ArrowType, CurveType } from '../canvas/index';
import { Boundary, Component, Domain, Label, Module, Note, Port, System, Tag, User, COLOR_PALETTE, NOTE_COLORS, NOTE_ICONS, TAG_COLORS } from '../canvas/index';

export interface ContextMenuItem {
    icon?: string;
    label?: string;
    action?: () => void;
    separator?: boolean;
    danger?: boolean;
    disabled?: boolean;
    colorPalette?: { colors: readonly string[]; current: string; onSelect: (color: string) => void };
    iconGrid?: { icons: readonly string[]; current: string; onSelect: (icon: string) => void };
}

export interface ContextMenuState {
    target: DiagramElement | Connection | null;
    clickPos: Point | null;
    anchorIndex: number | null;
}

export interface ContextMenuCallbacks {
    startTitleEdit: (element: DiagramElement) => void;
    startConnectionLabelEdit: (connection: Connection) => void;
    startDescriptionEdit: (component: Component) => void;
    addIntermediateAnchor: (connection: Connection, pos: Point) => void;
    removeIntermediateAnchor: (connection: Connection, index: number) => void;
    resetConnectionCurve: (connection: Connection) => void;
    reverseConnection: (connection: Connection) => void;
    removeConnection: (connection: Connection) => void;
    addPortToConnection: (connection: Connection, end: 'source' | 'target') => void;
    changeConnectionLineStyle: (connection: Connection, style: LineStyle) => void;
    changeConnectionArrowType: (connection: Connection, type: ArrowType) => void;
    toggleConnectionSourceArrow: (connection: Connection) => void;
    changeConnectionCurveType: (connection: Connection, type: CurveType) => void;
    changeBorderColor: (element: DiagramElement, color: string) => void;
    changeNoteColor: (note: Note, bgColor: string, textColor: string, accentColor: string, borderColor: string) => void;
    changeNoteIcon: (note: Note, icon: string) => void;
    changeNoteIconPosition: (note: Note, position: string) => void;
    changeTagColor: (tag: Tag, bgColor: string, textColor: string) => void;
    changeConnectionStrokeColor: (connection: Connection, color: string) => void;
    changeFontSize: (element: Label | Note, delta: number) => void;
    changeBoundaryLabelPosition: (element: Boundary, position: string) => void;
    startPortNumberEdit: (port: Port) => void;
    alignSelectedVertically: () => void;
    alignSelectedHorizontally: () => void;
    groupSelectedIntoModule: () => void;
    getSelectedElements: () => DiagramElement[];
    getElements: () => DiagramElement[];
    removeElement: (element: DiagramElement) => void;
}


export class ContextMenuHandler {
    private contextMenu: HTMLElement;
    private menuItems: HTMLElement;
    private state: ContextMenuState = {
        target: null,
        clickPos: null,
        anchorIndex: null
    };
    private callbacks: ContextMenuCallbacks;

    constructor(contextMenuId: string, callbacks: ContextMenuCallbacks) {
        const contextMenu = document.getElementById(contextMenuId);
        if (!contextMenu) {
            throw new Error(`Context menu element with id "${contextMenuId}" not found`);
        }
        this.contextMenu = contextMenu;

        const menuItems = document.getElementById('context-menu-items');
        if (!menuItems) {
            throw new Error('Context menu items container not found');
        }
        this.menuItems = menuItems;
        this.callbacks = callbacks;

        // Setup document click handler to close menu
        document.addEventListener('click', (e) => this.handleDocumentClick(e));
    }

    getState(): ContextMenuState {
        return this.state;
    }

    setClickPos(pos: Point): void {
        this.state.clickPos = pos;
    }

    setAnchorIndex(index: number | null): void {
        this.state.anchorIndex = index;
    }

    show(x: number, y: number, target: DiagramElement | Connection): void {
        this.state.target = target;
        this.menuItems.innerHTML = '';

        // Build menu based on target type
        if (this.isConnection(target)) {
            this.buildConnectionMenu(target);
        } else {
            this.buildElementMenu(target);
        }

        // Position and show menu, then clamp within the viewport
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';

        const menuRect = this.contextMenu.getBoundingClientRect();
        const clampedLeft = Math.max(0, Math.min(x, window.innerWidth - menuRect.width));
        const clampedTop = Math.max(0, Math.min(y, window.innerHeight - menuRect.height));
        this.contextMenu.style.left = `${clampedLeft}px`;
        this.contextMenu.style.top = `${clampedTop}px`;
    }

    hide(): void {
        this.contextMenu.style.display = 'none';
        this.state.target = null;
    }

    private handleDocumentClick(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        if (this.contextMenu.contains(target)) {
            return;
        }
        this.hide();
    }

    private isConnection(target: DiagramElement | Connection): target is Connection {
        return 'sourcePoint' in target && 'targetPoint' in target;
    }

    private buildConnectionMenu(connection: Connection): void {
        const items: ContextMenuItem[] = [
            {
                icon: 'square-letter-t',
                label: 'Edit Label',
                action: () => this.callbacks.startConnectionLabelEdit(connection)
            },
            {
                icon: 'circle-plus',
                label: 'Add Control Point',
                action: () => {
                    if (this.state.clickPos) {
                        this.callbacks.addIntermediateAnchor(connection, this.state.clickPos);
                    }
                }
            }
        ];

        // Add "Remove Control Point" if we clicked on an intermediate anchor
        if (this.state.anchorIndex !== null) {
            items.push({
                icon: 'minus-circle',
                label: 'Remove Control Point',
                action: () => this.callbacks.removeIntermediateAnchor(connection, this.state.anchorIndex!)
            });
        }

        items.push({
            icon: 'refresh',
            label: 'Reset Curve',
            action: () => this.callbacks.resetConnectionCurve(connection)
        });
        items.push({
            icon: 'transfer-vertical',
            label: 'Reverse Direction',
            action: () => this.callbacks.reverseConnection(connection)
        });
        items.push({
            icon: 'arrows-horizontal',
            label: connection.sourceArrowType !== 'none' ? 'Remove Source Arrow' : 'Add Source Arrow',
            action: () => this.callbacks.toggleConnectionSourceArrow(connection)
        });

        // Add port options (only for endpoints not already on a Port)
        const elements = this.callbacks.getElements();
        const srcEl = elements.find(e => e.id === connection.sourcePoint.componentId);
        const tgtEl = elements.find(e => e.id === connection.targetPoint.componentId);
        const canAddSrc = srcEl && !(srcEl instanceof Port);
        const canAddTgt = tgtEl && !(tgtEl instanceof Port);
        if (canAddSrc || canAddTgt) {
            items.push({ separator: true });
            if (canAddSrc) {
                items.push({
                    icon: 'plug',
                    label: `Add Port to "${srcEl!.title}"`,
                    action: () => this.callbacks.addPortToConnection(connection, 'source')
                });
            }
            if (canAddTgt) {
                items.push({
                    icon: 'plug',
                    label: `Add Port to "${tgtEl!.title}"`,
                    action: () => this.callbacks.addPortToConnection(connection, 'target')
                });
            }
        }

        // Line style options
        items.push({ separator: true });
        const lineStyles: { value: LineStyle; label: string; icon: string }[] = [
            { value: 'solid', label: 'Solid Line', icon: 'minus' },
            { value: 'dashed', label: 'Dashed Line', icon: 'line-dashed' },
            { value: 'dotted', label: 'Dotted Line', icon: 'dots' }
        ];
        for (const style of lineStyles) {
            const active = style.value === connection.lineStyle;
            items.push({
                icon: style.icon,
                label: style.label,
                disabled: active,
                action: active ? undefined : () => this.callbacks.changeConnectionLineStyle(connection, style.value)
            });
        }

        // Arrow type options
        items.push({ separator: true });
        const arrowTypes: { value: ArrowType; label: string; icon: string }[] = [
            { value: 'filled', label: 'Filled Arrow', icon: 'caret-right-filled' },
            { value: 'outline', label: 'Outline Arrow', icon: 'caret-right' },
            { value: 'line', label: 'Line Arrow', icon: 'chevron-right' },
            { value: 'none', label: 'No Arrow', icon: 'minus' }
        ];
        for (const arrow of arrowTypes) {
            const active = arrow.value === connection.arrowType;
            items.push({
                icon: arrow.icon,
                label: arrow.label,
                disabled: active,
                action: active ? undefined : () => this.callbacks.changeConnectionArrowType(connection, arrow.value)
            });
        }

        // Curve type options
        items.push({ separator: true });
        const curveTypes: { value: CurveType; label: string; icon: string }[] = [
            { value: 'bezier', label: 'Bezier Curve', icon: 'ease-in-out-control-points' },
            { value: 'catmull-rom', label: 'Smooth Spline', icon: 'vector-spline' }
        ];
        for (const curve of curveTypes) {
            const active = curve.value === connection.curveType;
            items.push({
                icon: curve.icon,
                label: curve.label,
                disabled: active,
                action: active ? undefined : () => this.callbacks.changeConnectionCurveType(connection, curve.value)
            });
        }

        // Stroke color palette
        items.push({ separator: true });
        items.push({
            colorPalette: {
                colors: COLOR_PALETTE,
                current: connection.strokeColor,
                onSelect: (color) => this.callbacks.changeConnectionStrokeColor(connection, color)
            }
        });

        items.push(
            { separator: true },
            {
                icon: 'trash-x',
                label: 'Delete',
                action: () => this.callbacks.removeConnection(connection),
                danger: true
            }
        );

        this.renderItems(items);
    }

    private buildElementMenu(element: DiagramElement): void {
        const items: ContextMenuItem[] = [];

        // Edit title / protocol option
        items.push({
            icon: 'square-letter-t',
            label: element instanceof Port ? 'Edit Protocol' : 'Edit Title',
            action: () => this.callbacks.startTitleEdit(element)
        });

        // Add description option (only for Component type)
        if (element instanceof Component) {
            const hasDescription = element.description && element.description.length > 0;
            items.push({
                icon: hasDescription ? 'notes' : 'notes',
                label: hasDescription ? 'Edit Description' : 'Add Description',
                action: () => this.callbacks.startDescriptionEdit(element)
            });
        }

        // Font size options (for Label and Note)
        if (element instanceof Label || element instanceof Note) {
            items.push({ separator: true });
            items.push({
                icon: 'plus',
                label: 'Increase Font Size',
                action: () => this.callbacks.changeFontSize(element, 2)
            });
            items.push({
                icon: 'minus',
                label: 'Decrease Font Size',
                action: () => this.callbacks.changeFontSize(element, -2)
            });
        }

        // Note color palette, icon picker, and icon position
        if (element instanceof Note) {
            items.push({ separator: true });
            items.push({
                colorPalette: {
                    colors: NOTE_COLORS.map(c => c.bg),
                    current: element.backgroundColor,
                    onSelect: (color) => {
                        const match = NOTE_COLORS.find(c => c.bg === color);
                        if (match) {
                            this.callbacks.changeNoteColor(element, match.bg, match.text, match.accent, match.border);
                        }
                    }
                }
            });
            items.push({ separator: true });
            items.push({
                iconGrid: {
                    icons: NOTE_ICONS,
                    current: element.noteIcon,
                    onSelect: (icon) => this.callbacks.changeNoteIcon(element, icon)
                }
            });
            if (element.noteIcon) {
                items.push({
                    icon: 'x',
                    label: 'Remove Icon',
                    action: () => this.callbacks.changeNoteIcon(element, '')
                });
            }
            items.push({ separator: true });
            const positions = [
                { value: 'top-left', label: 'Top Left', icon: 'arrow-up-left' },
                { value: 'top-right', label: 'Top Right', icon: 'arrow-up-right' },
                { value: 'bottom-left', label: 'Bottom Left', icon: 'arrow-down-left' },
                { value: 'bottom-right', label: 'Bottom Right', icon: 'arrow-down-right' },
            ];
            for (const pos of positions) {
                const active = pos.value === element.noteIconPosition;
                items.push({
                    icon: pos.icon,
                    label: `Icon ${pos.label}`,
                    disabled: active,
                    action: active ? undefined : () => this.callbacks.changeNoteIconPosition(element, pos.value)
                });
            }
        }

        // Label position option (only for Boundary type)
        if (element instanceof Boundary) {
            items.push({ separator: true });
            const positions = [
                { value: 'top-left', label: 'Top Left', icon: 'arrow-up-left' },
                { value: 'top-right', label: 'Top Right', icon: 'arrow-up-right' },
                { value: 'bottom-left', label: 'Bottom Left', icon: 'arrow-down-left' },
                { value: 'bottom-right', label: 'Bottom Right', icon: 'arrow-down-right' }
            ];
            for (const pos of positions) {
                const active = pos.value === element.labelPosition;
                items.push({
                    icon: pos.icon,
                    label: `Label ${pos.label}`,
                    disabled: active,
                    action: active ? undefined : () => this.callbacks.changeBoundaryLabelPosition(element, pos.value)
                });
            }
        }

        // Port number option
        if (element instanceof Port) {
            items.push({ separator: true });
            items.push({
                icon: 'hash',
                label: element.portNumber !== null ? 'Edit Port Number' : 'Set Port Number',
                action: () => this.callbacks.startPortNumberEdit(element)
            });
        }

        // Border color palette (for elements with borderColor)
        if (element instanceof Component || element instanceof User || element instanceof Module || element instanceof Domain || element instanceof System || element instanceof Boundary) {
            items.push({ separator: true });
            items.push({
                colorPalette: {
                    colors: COLOR_PALETTE,
                    current: element.borderColor,
                    onSelect: (color) => this.callbacks.changeBorderColor(element, color)
                }
            });
        }

        if (element instanceof Port) {
            items.push({ separator: true });
            items.push({
                colorPalette: {
                    colors: COLOR_PALETTE,
                    current: element.portColor,
                    onSelect: (color) => this.callbacks.changeBorderColor(element, color)
                }
            });
        }

        // Tag color palette
        if (element instanceof Tag) {
            items.push({ separator: true });
            items.push({
                colorPalette: {
                    colors: TAG_COLORS.map(c => c.bg),
                    current: element.backgroundColor,
                    onSelect: (color) => {
                        const match = TAG_COLORS.find(c => c.bg === color);
                        if (match) {
                            this.callbacks.changeTagColor(element, match.bg, match.text);
                        }
                    }
                }
            });
        }

        // Alignment and grouping options when multiple elements are selected
        const selectedElements = this.callbacks.getSelectedElements();
        if (selectedElements.length > 1 && selectedElements.includes(element)) {
            items.push({ separator: true });
            items.push({
                icon: 'box-model-2',
                label: 'Group into Module',
                action: () => this.callbacks.groupSelectedIntoModule()
            });
            items.push({
                icon: 'layout-align-center',
                label: 'Align Center Horizontally',
                action: () => this.callbacks.alignSelectedHorizontally()
            });
            items.push({
                icon: 'layout-align-middle',
                label: 'Align Center Vertically',
                action: () => this.callbacks.alignSelectedVertically()
            });
        }

        // Delete option
        items.push({ separator: true });
        items.push({
            icon: 'trash-x',
            label: 'Delete',
            action: () => this.callbacks.removeElement(element),
            danger: true
        });

        this.renderItems(items);
    }

    private renderItems(items: ContextMenuItem[]): void {
        for (const item of items) {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                this.menuItems.appendChild(separator);
            } else if (item.colorPalette) {
                const palette = item.colorPalette;
                const row = document.createElement('div');
                row.className = 'context-menu-colors';
                for (const color of palette.colors) {
                    const swatch = document.createElement('div');
                    swatch.className = 'color-swatch' + (color === palette.current ? ' active' : '');
                    swatch.style.backgroundColor = color;
                    swatch.title = color;
                    swatch.addEventListener('click', () => {
                        palette.onSelect(color);
                        this.hide();
                    });
                    row.appendChild(swatch);
                }
                this.menuItems.appendChild(row);
            } else if (item.iconGrid) {
                const grid = item.iconGrid;
                const row = document.createElement('div');
                row.className = 'context-menu-icon-grid';
                for (const iconName of grid.icons) {
                    const cell = document.createElement('div');
                    cell.className = 'icon-grid-cell' + (iconName === grid.current ? ' active' : '');
                    cell.title = iconName;
                    const icon = document.createElement('i');
                    icon.className = `ti ti-${iconName}`;
                    cell.appendChild(icon);
                    cell.addEventListener('click', () => {
                        grid.onSelect(iconName);
                        this.hide();
                    });
                    row.appendChild(cell);
                }
                this.menuItems.appendChild(row);
            } else {
                const menuItem = document.createElement('div');
                const classes = ['context-menu-item'];
                if (item.danger) classes.push('danger');
                if (item.disabled) classes.push('disabled');
                menuItem.className = classes.join(' ');
                const iconEl = document.createElement('i');
                iconEl.className = `ti ti-${item.icon}`;
                const labelEl = document.createElement('span');
                labelEl.textContent = item.label ?? '';
                menuItem.appendChild(iconEl);
                menuItem.appendChild(labelEl);
                if (!item.disabled) {
                    menuItem.addEventListener('click', () => {
                        if (item.action) {
                            item.action();
                        }
                        this.hide();
                    });
                }
                this.menuItems.appendChild(menuItem);
            }
        }

    }
}
