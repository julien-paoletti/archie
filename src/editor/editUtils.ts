/**
 * Edit Utilities
 * Shared helpers for inline editing controllers
 */

export interface EditCallbacks {
    render: () => void;
    saveState: () => void;
    saveToStorage: () => void;
    worldToScreen: (x: number, y: number) => { x: number; y: number };
    getScale: () => number;
    getCanvasRect: () => DOMRect;
}

export function createInput(type: string, className: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.className = className;
    input.style.position = 'absolute';
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.zIndex = '1000';
    return input;
}

export function attachInputListeners(
    input: HTMLInputElement,
    onFinish: () => void,
    onCancel: () => void
): void {
    input.addEventListener('blur', onFinish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') onFinish();
        else if (e.key === 'Escape') onCancel();
    });
}

export function mountAndFocus(input: HTMLInputElement | HTMLTextAreaElement, delay: number = 0): void {
    document.body.appendChild(input);
    if (delay > 0) {
        setTimeout(() => { input.focus(); input.select?.(); }, delay);
    } else {
        input.focus();
        if (input instanceof HTMLInputElement) input.select();
    }
}
