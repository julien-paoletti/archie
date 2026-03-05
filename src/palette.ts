/**
 * Palette Module
 * Manages the component palette for drag and drop
 */

import { elementRegistry, preloadIcons, type ElementConstructor } from './canvas/index.ts';

// ============================================================================
// Tooltip descriptions for each element type
// ============================================================================

const ELEMENT_TOOLTIPS: Record<string, { name: string; desc: string }> = {
    component:   { name: 'Component',     desc: 'A service, application, or tech unit inside a module.' },
    module:      { name: 'Module',        desc: 'Groups related components. Contained in a domain.' },
    domain:      { name: 'Domain',        desc: 'A business capability area. Groups modules.' },
    system:      { name: 'System',        desc: 'Top-level boundary grouping one or more domains.' },
    boundary:    { name: 'Boundary',      desc: 'Annotates a group of elements with a dashed border.' },
    user:        { name: 'User',          desc: 'A human actor or stakeholder in the architecture.' },
    note:        { name: 'Note',          desc: 'A free-text annotation or explanation.' },
    numberedDot: { name: 'Numbered Dot',  desc: 'A callout marker for step-by-step flows.' },
    label:       { name: 'Label',         desc: 'Plain text with no background or border.' },
    tag:         { name: 'Tag',           desc: 'A small colored label for quick categorisation.' },
};

// ============================================================================
// Types
// ============================================================================

export interface PaletteOptions {
    onDragStart?: (ElementClass: ElementConstructor) => void;
}

interface DragData {
    type: string;
    action: 'create';
}

// ============================================================================
// Palette Class
// ============================================================================

export class Palette {
    private container: HTMLElement;
    private onDragStart: (ElementClass: ElementConstructor) => void;
    private items: HTMLElement[];
    private tooltipEl: HTMLDivElement;
    private tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(containerId: string, options: PaletteOptions = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        this.container = container;
        this.onDragStart = options.onDragStart ?? (() => { });
        this.items = [];

        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'palette-tooltip';
        this.tooltipEl.style.display = 'none';
        document.body.appendChild(this.tooltipEl);

        this.init();
    }

    private async init(): Promise<void> {
        // Preload all icons before rendering palette items
        await preloadIcons();
        this.renderItems();
    }

    private renderItems(): void {
        const itemsContainer = this.container.querySelector('#palette-items') ?? this.container;
        itemsContainer.innerHTML = '';

        const componentTypes = elementRegistry.getAll();

        componentTypes.forEach(ElementClass => {
            const item = this.createPaletteItem(ElementClass);
            itemsContainer.appendChild(item);
            this.items.push(item);
        });
    }

    private createPaletteItem(ElementClass: ElementConstructor): HTMLElement {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.dataset.componentType = ElementClass.type;
        item.draggable = true;

        const tooltipData = ELEMENT_TOOLTIPS[ElementClass.type];

        if (tooltipData) {
            item.addEventListener('mouseenter', () => {
                if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
                this.tooltipTimeout = setTimeout(() => {
                    const rect = item.getBoundingClientRect();
                    this.tooltipEl.innerHTML = `<strong>${tooltipData.name}</strong><br>${tooltipData.desc}`;
                    this.tooltipEl.style.display = 'block';
                    this.tooltipEl.style.left = `${rect.right + 8}px`;
                    this.tooltipEl.style.top = `${rect.top + rect.height / 2 - this.tooltipEl.offsetHeight / 2}px`;
                }, 400);
            });
            item.addEventListener('mouseleave', () => {
                if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); this.tooltipTimeout = null; }
                this.tooltipEl.style.display = 'none';
            });
            item.addEventListener('dragstart', () => {
                if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); this.tooltipTimeout = null; }
                this.tooltipEl.style.display = 'none';
            });
        }

        // Create preview canvas
        const canvas = document.createElement('canvas');
        const previewWidth = 110;
        const previewHeight = 60;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = previewWidth * dpr;
        canvas.height = previewHeight * dpr;
        canvas.style.width = `${previewWidth}px`;
        canvas.style.height = `${previewHeight}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);

            // Use the element's natural default size
            const previewComponent = ElementClass.createDefault();
            if (ElementClass.type === 'user') {
                previewComponent.hideTitle = true;
            }

            // Scale down if the element is too large for the preview area
            const padding = 10;
            const maxW = previewWidth - padding * 2;
            const maxH = previewHeight - padding * 2;
            const scaleX = previewComponent.width > maxW ? maxW / previewComponent.width : 1;
            const scaleY = previewComponent.height > maxH ? maxH / previewComponent.height : 1;
            const scale = Math.min(scaleX, scaleY);

            if (scale < 1) {
                previewComponent.width *= scale;
                previewComponent.height *= scale;
            }

            previewComponent.x = (previewWidth - previewComponent.width) / 2;
            previewComponent.y = (previewHeight - previewComponent.height) / 2;
            previewComponent.draw(ctx);
        }

        item.appendChild(canvas);

        // Setup drag events
        item.addEventListener('dragstart', (e) => this.handleDragStart(e, ElementClass));
        item.addEventListener('dragend', (_e) => this.handleDragEnd());

        return item;
    }

    private handleDragStart(e: DragEvent, ElementClass: ElementConstructor): void {
        if (!e.dataTransfer) return;

        // Create a ghost image for dragging
        const ghost = this.createDragGhost(ElementClass);
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, ghost.width / 2, ghost.height / 2);

        // Clean up ghost after a short delay
        setTimeout(() => ghost.remove(), 0);

        // Set drag data
        e.dataTransfer.effectAllowed = 'copy';
        const dragData: DragData = {
            type: ElementClass.type,
            action: 'create'
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));

        this.onDragStart(ElementClass);
    }

    private handleDragEnd(): void {
        // Clean up any drag state
    }

    private createDragGhost(ElementClass: ElementConstructor): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const component = ElementClass.createDefault();
        const padding = 20;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = (component.width + padding * 2) * dpr;
        canvas.height = (component.height + padding * 2) * dpr;
        canvas.style.position = 'fixed';
        canvas.style.top = '-9999px';
        canvas.style.left = '-9999px';

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            component.x = padding;
            component.y = padding;
            component.draw(ctx);
        }

        return canvas;
    }
}
