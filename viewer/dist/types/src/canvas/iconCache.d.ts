/**
 * IconCache - Pre-caches SVG icons as ImageBitmap for efficient canvas rendering
 */
export declare class IconCache {
    private static instance;
    private cache;
    private loadingPromises;
    private constructor();
    static getInstance(): IconCache;
    /**
     * Load an icon from SVG string and cache it
     */
    loadIcon(name: string, svgString: string, size?: number, color?: string): Promise<ImageBitmap>;
    /**
     * Create ImageBitmap from SVG string
     */
    private createBitmap;
    /**
     * Ensure SVG has width and height attributes
     */
    private ensureSvgSize;
    /**
     * Check if icon is cached
     */
    has(name: string, size?: number, color?: string): boolean;
    /**
     * Get cached icon (returns undefined if not cached)
     */
    get(name: string, size?: number, color?: string): ImageBitmap | undefined;
    /**
     * Draw icon on canvas context
     */
    draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size?: number, color?: string): boolean;
    /**
     * Clear all cached icons
     */
    clear(): void;
    /**
     * Remove specific icon from cache
     */
    remove(name: string, size?: number): void;
}
export declare const iconCache: IconCache;
export declare const TABLER_ICONS: Record<string, string>;
/**
 * Get list of available icon names
 */
export declare function getAvailableIcons(): string[];
/**
 * Helper to preload all icons at a specific size
 */
export declare function preloadIcons(size?: number, color?: string): Promise<void>;
