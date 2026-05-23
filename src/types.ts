/**
 * Shared types for the public API.
 */

export type FontFamily = string;
export type Align = 'left' | 'center' | 'right';

export interface TextOptions {
  /**
   * Horizontal alignment shorthand. Sets a sensible (x, anchor) pair:
   *   - `'left'`   → x = padding, anchor = 'start'  (default)
   *   - `'center'` → x = width/2, anchor = 'middle'
   *   - `'right'`  → x = width - padding, anchor = 'end'
   * Overridden by an explicit `x` or `anchor`.
   */
  align?: Align;
  /** X coordinate. Wins over `align`. */
  x?: number;
  /** Override Y (default: current cursor). */
  y?: number;
  /** Text anchor. Wins over `align`. */
  anchor?: 'start' | 'middle' | 'end';
  /** Font family stack. Common shorthands: `'georgia'`, `'helvetica'`, `'mono'`. */
  family?: FontFamily;
  /** Font size in pixels. Default 14. */
  size?: number;
  /** Numeric font weight (100..900). Default 400. */
  weight?: number;
  /** `'italic'` or `'oblique'`. */
  style?: 'normal' | 'italic' | 'oblique';
  /** Letter-spacing in pixels. */
  spacing?: number;
  /** Fill colour. Defaults to black; usually no reason to change. */
  fill?: string;
}

export interface DotOptions {
  /** Y coordinate. Default: the page's current cursor. */
  y?: number;
  /** Radius in pixels. Default 2. */
  r?: number;
  /** Fill colour. Defaults to black. */
  fill?: string;
}

export interface KvOptions {
  /** Options applied to the label (left). */
  labelOpts?: TextOptions;
  /** Options applied to the value (right). */
  valueOpts?: TextOptions;
}

export interface IconOptions {
  /** Override X coordinate (default: page padding). */
  x?: number;
  /** Y offset from the current cursor (default 0). Use negative values to align an icon with text. */
  dy?: number;
  /** Fill colour. Defaults to black. */
  fill?: string;
}

export interface RuleOptions {
  /** Override start X. */
  x1?: number;
  /** Override end X. */
  x2?: number;
  /** Stroke width in pixels. Default 1. */
  stroke?: number;
  /** Dash pattern (e.g. `'4,2'` for dashed). */
  dasharray?: string;
}

export interface RowOptions {
  /** Horizontal gap between row items (defaults to 0). */
  gap?: number;
  /** How much to advance the cursor after the row (default: nothing — caller advances). */
  advance?: number;
}

export interface ImageOptions {
  /** X coordinate (default: page padding). */
  x?: number;
  /** Y coordinate (default: current cursor). */
  y?: number;
  /** Width override. Defaults to the PNG's native width. */
  width?: number;
  /** Height override. Defaults to the PNG's native height. */
  height?: number;
}

export interface PageOptions {
  /** Output width in pixels. Default 504 (TM-T88VI printable area at 180 dpi). Must be a multiple of 8. */
  width?: number;
  /** Horizontal padding around the content area. Default 22. */
  padding?: number;
  /** Map of icon name → inner SVG string, OR a list of names to load from Phosphor. */
  icons?: string[] | Record<string, string>;
  /** Default font family stack used by `text()` when no family is given. */
  defaultFontFamily?: FontFamily;
}

export interface RenderOptions {
  /** Sharp rasterisation density (DPI). Default 240. */
  density?: number;
  /** Output width in pixels (default: page.width). */
  width?: number;
  /** Threshold for 1-bit conversion (0..255). Default 140. */
  threshold?: number;
}

export type DitherAlgorithm = 'atkinson' | 'fs' | 'bayer' | 'none';

export interface PosterOptions {
  /** Target display width in pixels (default 100). */
  width?: number;
  /** Dithering algorithm. Default `'atkinson'`. */
  dither?: DitherAlgorithm;
  /** Local-contrast boost. `'clahe'` works best for posters; `'normalize'` only stretches the global range. */
  contrast?: 'clahe' | 'normalize' | 'none';
  /** User-Agent header for the download request. */
  userAgent?: string;
}

export interface PreparedImage {
  /** PNG bytes (greyscale, exactly 0/255 pixels for dithered output). */
  data: Buffer;
  width: number;
  height: number;
}
