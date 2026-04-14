/**
 * Archie - Architecture Diagram Editor
 * Main Application Entry Point
 */

import { Palette } from './palette.ts';
import { Editor } from './editor.ts';
import { GRID_SIZE } from './canvas/constants.ts';
import { showAlert, showConfirm, showPrompt } from './modal.ts';
import { DEMOS } from './demos.ts';

// ============================================================================
// Types
// ============================================================================

// File System Access API types
interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    close(): Promise<void>;
}

interface FileSystemFileHandle {
    kind: 'file';
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
}

interface OpenFilePickerOptions {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
}

declare global {
    interface Window {
        archie: ArchieApp;
        showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
        showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    }
}

// ============================================================================
// Application Class
// ============================================================================

class ArchieApp {
    public palette: Palette | null = null;
    public editor: Editor | null = null;
    private fileHandle: FileSystemFileHandle | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    private setup(): void {
        // Initialize the editor
        this.editor = new Editor('editor-canvas', {
            snapToGrid: true,
            gridSize: GRID_SIZE
        });

        // Initialize the palette
        this.palette = new Palette('palette', {
            onDragStart: (ComponentClass) => {
                console.log(`Dragging ${ComponentClass.displayName}`);
            }
        });

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup toolbar buttons
        this.setupToolbarButtons();

        // Setup examples dropdown
        this.setupExamplesDropdown();

        // Setup palette toggle
        this.setupPaletteToggle();

        console.log('Archie initialized successfully');
    }

    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const selectedComponents = this.editor?.getSelectedComponents() ?? [];
            const selectedConnection = this.editor?.getSelectedConnection();

            // Delete selected components or connection
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Only delete if not focused on an input
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    if (selectedComponents.length > 0) {
                        this.editor?.removeComponents(selectedComponents);
                        e.preventDefault();
                    } else if (selectedConnection) {
                        this.editor?.removeConnection(selectedConnection);
                        e.preventDefault();
                    }
                }
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                if (selectedComponents.length > 0) {
                    this.editor?.clearSelection();
                    this.editor?.render();
                }
                if (selectedConnection) {
                    this.editor?.selectConnection(null);
                    this.editor?.render();
                }
            }

            // Ctrl+N for new diagram
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newDiagram();
            }

            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDiagram();
            }

            // Ctrl+O to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.loadDiagram();
            }

            // Ctrl+A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.selectAll();
                }
            }

            // Ctrl+Z to undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.undo();
                }
            }

            // Ctrl+Y or Ctrl+Shift+Z to redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.redo();
                }
            }

            // Ctrl+C to copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.copy();
                }
            }

            // Ctrl+X to cut
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.cut();
                }
            }

            // Ctrl+V to paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                const activeElement = document.activeElement;
                if (activeElement && !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
                    e.preventDefault();
                    this.editor?.paste();
                }
            }
        });
    }

    private setupToolbarButtons(): void {
        const blurAfter = (action: () => void) => () => {
            action();
            (document.activeElement as HTMLElement)?.blur();
        };

        const newBtn = document.getElementById('new-btn');
        if (newBtn) {
            newBtn.addEventListener('click', blurAfter(() => this.newDiagram()));
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', blurAfter(() => this.saveDiagram()));
        }

        const openBtn = document.getElementById('open-btn');
        if (openBtn) {
            openBtn.addEventListener('click', blurAfter(() => this.loadDiagram()));
        }

        const pngToggle = document.getElementById('png-dropdown-toggle');
        const pngMenu = document.getElementById('png-dropdown-menu');
        const copyPngBtn = document.getElementById('copy-png-btn');
        const downloadPngBtn = document.getElementById('download-png-btn');

        if (pngToggle && pngMenu) {
            pngToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                pngMenu.classList.toggle('open');
            });
            document.addEventListener('click', (e) => {
                if (!pngMenu.contains(e.target as Node)) {
                    pngMenu.classList.remove('open');
                }
            });
        }
        if (copyPngBtn) {
            copyPngBtn.addEventListener('click', blurAfter(() => {
                pngMenu?.classList.remove('open');
                this.editor?.copyPNG((err) => {
                    if (err) this.showToast('Failed to copy PNG', 3000, 'error');
                    else this.showToast('Copied to clipboard');
                });
            }));
        }
        if (downloadPngBtn) {
            downloadPngBtn.addEventListener('click', blurAfter(() => {
                pngMenu?.classList.remove('open');
                this.editor?.exportPNG();
            }));
        }
    }

    private setupExamplesDropdown(): void {
        const select = document.getElementById('examples-select') as HTMLSelectElement | null;
        if (!select) return;

        for (const demo of DEMOS) {
            const option = document.createElement('option');
            option.value = demo.id;
            option.textContent = demo.label;
            select.appendChild(option);
        }

        select.addEventListener('change', async () => {
            const id = select.value;
            if (!id) return;

            const demo = DEMOS.find(d => d.id === id);
            if (!demo || !this.editor) return;

            const hasElements = this.editor.toJSON().components.length > 0;
            if (hasElements) {
                const confirmed = await showConfirm(
                    'Load Example',
                    `Load "${demo.label}"? Any unsaved changes will be lost.`,
                    'Load Example',
                    true
                );
                if (!confirmed) {
                    select.value = '';
                    return;
                }
            }

            this.editor.fromJSON(demo.diagram);
            this.fileHandle = null;
            this.showToast(`Loaded: ${demo.label}`);
            select.value = '';
        });
    }

    private setupPaletteToggle(): void {
        const palette = document.getElementById('palette');
        const toggle = document.getElementById('palette-toggle');
        if (!palette || !toggle) return;

        // Restore collapsed state from localStorage
        if (localStorage.getItem('archie-palette-collapsed') === 'true') {
            palette.classList.add('collapsed');
        }

        toggle.addEventListener('click', () => {
            palette.classList.toggle('collapsed');
            localStorage.setItem(
                'archie-palette-collapsed',
                String(palette.classList.contains('collapsed'))
            );
            // Trigger editor resize after transition
            setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
        });
    }

    private showToast(message: string, duration = 2000, type: 'default' | 'error' = 'default'): void {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = type === 'error' ? 'toast toast-error' : 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    private async saveDiagram(): Promise<void> {
        if (!this.editor) return;

        const data = this.editor.toJSON();
        const json = JSON.stringify(data, null, 2);

        // Try to use File System Access API (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                // Reuse existing handle if available, otherwise show picker
                const handle = this.fileHandle ?? await window.showSaveFilePicker!({
                    suggestedName: 'diagram.json',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(json);
                await writable.close();

                this.fileHandle = handle;
                this.showToast(`Saved to ${handle.name}`);
                return;
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Failed to save file:', err);
                    this.showToast('Failed to save file', 3000, 'error');
                }
                return;
            }
        }

        // Fallback: prompt for filename and use download
        const filename = await showPrompt('Save Diagram', 'Enter filename:', 'diagram.json');
        if (!filename) return; // User cancelled

        // Ensure .json extension
        const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showToast(`Saved as ${finalFilename}`);
    }

    private async loadDiagram(): Promise<void> {
        if (!this.editor) return;

        // Try to use File System Access API (modern browsers)
        if ('showOpenFilePicker' in window) {
            try {
                const handles = await window.showOpenFilePicker!({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });

                const handle = handles[0];
                if (!handle) return;

                const permission = await (handle as any).requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') return;

                const file = await handle.getFile();
                const text = await file.text();
                const data = JSON.parse(text);

                this.editor.fromJSON(data);
                this.fileHandle = handle;

                this.showToast(`Opened ${handle.name}`);
                return;
            } catch (err) {
                // User cancelled or error occurred
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Failed to load file:', err);
                    showAlert('Error', 'Failed to load diagram file. Please check the file format.');
                }
                return;
            }
        }

        // Fallback: use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';

        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                this.editor!.fromJSON(data);

                this.showToast(`Opened ${file.name}`);
            } catch (err) {
                console.error('Failed to load diagram:', err);
                showAlert('Error', 'Failed to load diagram file. Please check the file format.');
            }
        };

        input.click();
    }

    private async newDiagram(): Promise<void> {
        if (!this.editor) return;

        // Check if there are any elements in the current diagram
        const hasElements = this.editor.getSelectedComponents().length > 0 ||
            this.editor.toJSON().components.length > 0;

        if (hasElements) {
            const confirmed = await showConfirm(
                'New Diagram',
                'Start a new diagram? Any unsaved changes will be lost.',
                'New Diagram',
                true
            );
            if (!confirmed) return;
        }

        // Clear the diagram
        this.editor.clearAll();
        this.fileHandle = null;
    }
}

// Initialize the application
const app = new ArchieApp();

// Expose for debugging
window.archie = app;
