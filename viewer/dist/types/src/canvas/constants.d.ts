/**
 * Constants for Canvas Drawing Library
 */
export declare const GRID_SIZE = 20;
export declare const HANDLE_SIZE = 8;
export declare const HANDLE_HITBOX = 12;
export declare const CONNECTION_POINT_RADIUS = 4;
export declare const CONNECTION_POINT_HITBOX = 15;
export declare const CONNECTION_POINT_INSIDE_MARGIN = 5;
export declare const MODULE_PADDING = 22;
export declare const MODULE_TITLE_HEIGHT = 29;
export declare const MODULE_MIN_WIDTH = 150;
export declare const MODULE_MIN_HEIGHT = 100;
export declare const DOMAIN_PADDING = 28;
export declare const DOMAIN_TITLE_HEIGHT = 36;
export declare const DOMAIN_MIN_WIDTH = 250;
export declare const DOMAIN_MIN_HEIGHT = 150;
export declare const SYSTEM_PADDING = 36;
export declare const SYSTEM_TITLE_HEIGHT = 44;
export declare const SYSTEM_MIN_WIDTH = 400;
export declare const SYSTEM_MIN_HEIGHT = 250;
/** 12-color palette used for element borders and connection strokes */
export declare const COLOR_PALETTE: readonly ["#D4D4D8", "#94A3B8", "#64748B", "#F87171", "#FB923C", "#FBBF24", "#34D399", "#22D3EE", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6"];
/** 8 themed color sets for Note elements */
export declare const NOTE_COLORS: readonly [{
    readonly bg: "#FEF9E7";
    readonly text: "#5D4E37";
    readonly accent: "#F6E05E";
    readonly border: "#E8DFC0";
}, {
    readonly bg: "#EFF6FF";
    readonly text: "#1E3A5F";
    readonly accent: "#60A5FA";
    readonly border: "#BFDBFE";
}, {
    readonly bg: "#F0FDF4";
    readonly text: "#14532D";
    readonly accent: "#4ADE80";
    readonly border: "#BBF7D0";
}, {
    readonly bg: "#FFF1F2";
    readonly text: "#7F1D1D";
    readonly accent: "#FB7185";
    readonly border: "#FECDD3";
}, {
    readonly bg: "#FAF5FF";
    readonly text: "#4C1D95";
    readonly accent: "#A78BFA";
    readonly border: "#DDD6FE";
}, {
    readonly bg: "#FFF7ED";
    readonly text: "#7C2D12";
    readonly accent: "#FB923C";
    readonly border: "#FED7AA";
}, {
    readonly bg: "#F0FDFA";
    readonly text: "#134E4A";
    readonly accent: "#2DD4BF";
    readonly border: "#99F6E4";
}, {
    readonly bg: "#F8FAFC";
    readonly text: "#334155";
    readonly accent: "#94A3B8";
    readonly border: "#CBD5E1";
}];
/** 8 themed color sets for Tag elements */
export declare const TAG_COLORS: readonly [{
    readonly bg: "#DBEAFE";
    readonly text: "#1E40AF";
}, {
    readonly bg: "#FEE2E2";
    readonly text: "#991B1B";
}, {
    readonly bg: "#D1FAE5";
    readonly text: "#065F46";
}, {
    readonly bg: "#FEF3C7";
    readonly text: "#92400E";
}, {
    readonly bg: "#EDE9FE";
    readonly text: "#5B21B6";
}, {
    readonly bg: "#FFE4E6";
    readonly text: "#9F1239";
}, {
    readonly bg: "#E0F2FE";
    readonly text: "#075985";
}, {
    readonly bg: "#F1F5F9";
    readonly text: "#334155";
}];
/** Blue highlight used for selected connections and handles */
export declare const SELECTED_COLOR = "#60a5fa";
/** Semi-transparent glow drawn behind selected connections */
export declare const SELECTION_HIGHLIGHT_COLOR = "rgba(96, 165, 250, 0.4)";
/** Dashed lines connecting control point handles to their anchor */
export declare const HANDLE_LINE_COLOR = "rgba(96, 165, 250, 0.3)";
/** White fill for outline arrowheads and handle centers */
export declare const HANDLE_FILL_COLOR = "#ffffff";
export declare const LABEL_BG_COLOR = "#ffffff";
export declare const LABEL_TEXT_COLOR = "#374151";
export declare const MINIMAP_CONNECTION_COLOR = "#94A3B8";
export declare const MINIMAP_VIEWPORT_FILL = "rgba(59, 130, 246, 0.08)";
export declare const MINIMAP_VIEWPORT_STROKE = "rgba(59, 130, 246, 0.6)";
/** Fill colors used to represent each element type in the minimap */
export declare const MINIMAP_ELEMENT_COLORS: {
    readonly system: "#F1F5F9";
    readonly domain: "#DBEAFE";
    readonly module: "#CCFBF1";
    readonly user: "#EDE9FE";
    readonly component: "#FFFFFF";
    readonly numberedDot: "#3B82F6";
    readonly fallback: "#E5E7EB";
};
