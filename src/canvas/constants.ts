/**
 * Constants for Canvas Drawing Library
 */

export const GRID_SIZE = 20;

// Resize handle dimensions
export const HANDLE_SIZE = 8;
export const HANDLE_HITBOX = 12;

// Connection point dimensions
export const CONNECTION_POINT_RADIUS = 4;
export const CONNECTION_POINT_HITBOX = 15;
export const CONNECTION_POINT_INSIDE_MARGIN = 5; // Max pixels inside element border for detection

// Module constants
export const MODULE_PADDING = 22;
export const MODULE_TITLE_HEIGHT = 29;
export const MODULE_MIN_WIDTH = 150;
export const MODULE_MIN_HEIGHT = 100;
export const MODULE_DESCRIPTION_OFFSET = 16; // px below the title bar to the description baseline

// Domain constants
export const DOMAIN_PADDING = 28;
export const DOMAIN_TITLE_HEIGHT = 36;
export const DOMAIN_MIN_WIDTH = 250;
export const DOMAIN_MIN_HEIGHT = 150;

// System constants
export const SYSTEM_PADDING = 36;
export const SYSTEM_TITLE_HEIGHT = 44;
export const SYSTEM_MIN_WIDTH = 400;
export const SYSTEM_MIN_HEIGHT = 250;

// --- Color palettes ---

/** 12-color palette used for element borders and connection strokes */
export const COLOR_PALETTE = [
    '#D4D4D8', '#94A3B8', '#64748B',
    '#F87171', '#FB923C', '#FBBF24',
    '#34D399', '#22D3EE', '#60A5FA',
    '#818CF8', '#A78BFA', '#F472B6'
] as const;

/** 8 themed color sets for Note elements */
export const NOTE_COLORS = [
    { bg: '#FEF9E7', text: '#5D4E37', accent: '#F6E05E', border: '#E8DFC0' }, // Yellow (default)
    { bg: '#EFF6FF', text: '#1E3A5F', accent: '#60A5FA', border: '#BFDBFE' }, // Blue
    { bg: '#F0FDF4', text: '#14532D', accent: '#4ADE80', border: '#BBF7D0' }, // Green
    { bg: '#FFF1F2', text: '#7F1D1D', accent: '#FB7185', border: '#FECDD3' }, // Red
    { bg: '#FAF5FF', text: '#4C1D95', accent: '#A78BFA', border: '#DDD6FE' }, // Purple
    { bg: '#FFF7ED', text: '#7C2D12', accent: '#FB923C', border: '#FED7AA' }, // Orange
    { bg: '#F0FDFA', text: '#134E4A', accent: '#2DD4BF', border: '#99F6E4' }, // Teal
    { bg: '#F8FAFC', text: '#334155', accent: '#94A3B8', border: '#CBD5E1' }, // Slate
] as const;

/** 8 themed color sets for Tag elements */
export const TAG_COLORS = [
    { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
    { bg: '#FEE2E2', text: '#991B1B' }, // Red
    { bg: '#D1FAE5', text: '#065F46' }, // Green
    { bg: '#FEF3C7', text: '#92400E' }, // Yellow
    { bg: '#EDE9FE', text: '#5B21B6' }, // Purple
    { bg: '#FFE4E6', text: '#9F1239' }, // Pink
    { bg: '#E0F2FE', text: '#075985' }, // Cyan
    { bg: '#F1F5F9', text: '#334155' }, // Slate
] as const;

// --- Selection / interaction colors ---

/** Blue highlight used for selected connections and handles */
export const SELECTED_COLOR = '#60a5fa';
/** Semi-transparent glow drawn behind selected connections */
export const SELECTION_HIGHLIGHT_COLOR = 'rgba(96, 165, 250, 0.4)';
/** Dashed lines connecting control point handles to their anchor */
export const HANDLE_LINE_COLOR = 'rgba(96, 165, 250, 0.3)';
/** White fill for outline arrowheads and handle centers */
export const HANDLE_FILL_COLOR = '#ffffff';

// --- Connection label colors ---
export const LABEL_BG_COLOR = '#ffffff';
export const LABEL_TEXT_COLOR = '#374151';

// --- Minimap colors ---
export const MINIMAP_CONNECTION_COLOR = '#94A3B8';
export const MINIMAP_VIEWPORT_FILL = 'rgba(59, 130, 246, 0.08)';
export const MINIMAP_VIEWPORT_STROKE = 'rgba(59, 130, 246, 0.6)';

/** Fill colors used to represent each element type in the minimap */
export const MINIMAP_ELEMENT_COLORS = {
    system: '#F1F5F9',
    domain: '#DBEAFE',
    module: '#CCFBF1',
    user: '#EDE9FE',
    component: '#FFFFFF',
    numberedDot: '#3B82F6',
    fallback: '#E5E7EB',
} as const;
