/**
 * Input Utilities
 * Helper functions for styling inline editing inputs
 */

export interface InputStyleOptions {
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize: number;
    textAlign?: 'left' | 'center' | 'right';
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    background?: string;
    border?: string;
    borderRadius?: string;
    padding?: string;
    zIndex?: string;
}

/**
 * Apply common base styles to an input element
 */
export function applyInputBaseStyles(
    input: HTMLInputElement | HTMLTextAreaElement,
    options: InputStyleOptions
): void {
    input.style.position = 'fixed';
    input.style.left = `${options.left}px`;
    input.style.top = `${options.top}px`;
    input.style.width = `${options.width}px`;
    input.style.height = `${options.height}px`;
    input.style.fontSize = `${options.fontSize}px`;
    input.style.textAlign = options.textAlign ?? 'center';
    input.style.fontFamily = options.fontFamily ?? '"Segoe UI", sans-serif';
    input.style.fontWeight = options.fontWeight ?? '400';
    input.style.color = options.color ?? '#1F2937';
    input.style.background = options.background ?? '#ffffff';
    input.style.border = options.border ?? 'none';
    input.style.borderRadius = options.borderRadius ?? '4px';
    input.style.outline = 'none';
    input.style.padding = options.padding ?? '0 8px';
    input.style.boxSizing = 'border-box';
    input.style.zIndex = options.zIndex ?? '1000';
}

/**
 * Create and style a title editing input
 */
export function createTitleInput(options: {
    left: number;
    top: number;
    width: number;
    scale: number;
    value: string;
    isBoundary?: boolean;
}): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = options.value;
    input.className = 'title-edit-input';

    const scaledFontSize = Math.max(10, Math.round(14 * options.scale));

    applyInputBaseStyles(input, {
        left: options.left,
        top: options.top,
        width: options.width,
        height: 28 * options.scale,
        fontSize: scaledFontSize,
        textAlign: 'center',
        fontWeight: '600',
        color: options.isBoundary ? '#64748B' : '#1F2937',
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        padding: `0 ${8 * options.scale}px`
    });

    return input;
}

/**
 * Create and style a connection label editing input
 */
export function createLabelInput(options: {
    left: number;
    top: number;
    width: number;
    scale: number;
    value: string;
}): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = options.value;

    const scaledFontSize = Math.max(10, Math.round(12 * options.scale));

    applyInputBaseStyles(input, {
        left: options.left,
        top: options.top,
        width: options.width,
        height: 28 * options.scale,
        fontSize: scaledFontSize,
        textAlign: 'center',
        color: '#374151',
        background: '#ffffff',
        border: '1px solid #f97316',
        borderRadius: '4px',
        padding: `0 ${8 * options.scale}px`
    });

    return input;
}

/**
 * Create and style a description editing input
 */
export function createDescriptionInput(options: {
    left: number;
    top: number;
    width: number;
    scale: number;
    value: string;
}): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = options.value;

    const scaledFontSize = Math.max(10, Math.round(11 * options.scale));

    applyInputBaseStyles(input, {
        left: options.left,
        top: options.top,
        width: options.width,
        height: 24 * options.scale,
        fontSize: scaledFontSize,
        textAlign: 'center',
        color: '#6B7280',
        background: '#ffffff',
        border: '1px solid #60a5fa',
        borderRadius: '4px',
        padding: `0 ${8 * options.scale}px`
    });

    return input;
}

/**
 * Create and style a text element editing textarea
 */
export function createTextarea(options: {
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    lineHeight: number;
    padding: number;
    background: string;
    value: string;
}): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.value = options.value;

    applyInputBaseStyles(textarea, {
        left: options.left,
        top: options.top,
        width: options.width,
        height: options.height,
        fontSize: options.fontSize,
        textAlign: 'left',
        fontFamily: options.fontFamily,
        color: options.color,
        background: options.background === 'transparent' ? '#ffffff' : options.background,
        border: '2px solid #3B82F6',
        borderRadius: '0',
        padding: `${options.padding}px`
    });

    textarea.style.lineHeight = `${options.lineHeight}`;
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';

    return textarea;
}
