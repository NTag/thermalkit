/**
 * The Page class — a thermal-receipt-oriented vertical layout builder.
 *
 * Conceptual model: a strip of paper (default 504 px wide for the TM-T88VI)
 * with a Y cursor you push down as you append content. Most calls advance
 * the cursor automatically; reach for `advance()` / `spacer()` when you need
 * manual control.
 */
import { loadIcons as loadPhosphorIcons } from './icons.js';
import {
  approxWidth,
  wrapByWidth,
  resolveFontFamily,
  escapeXml,
  buildTextFragment,
  buildRuleFragment,
  buildIconFragment,
} from './svg.js';
import type {
  PageOptions,
  TextOptions,
  IconOptions,
  RuleOptions,
  RowOptions,
  ImageOptions,
  RenderOptions,
} from './types.js';

const DEFAULT_FONT = 'Helvetica, Arial, sans-serif';

export class Page {
  /** Output width in pixels. */
  readonly width: number;
  /** Horizontal padding on left/right. */
  readonly padding: number;
  /** Width available for content (width - 2*padding). */
  readonly contentWidth: number;
  /** Current vertical cursor (mutable). */
  y = 0;

  private readonly parts: string[] = [];
  private readonly icons: Record<string, string>;
  private readonly defaultFontFamily: string;

  constructor(opts: PageOptions = {}) {
    this.width = opts.width ?? 504;
    if (this.width % 8 !== 0) {
      // ESC/POS GS v 0 requires the bitmap width to be a multiple of 8.
      throw new Error(`Page width must be a multiple of 8 (got ${this.width})`);
    }
    this.padding = opts.padding ?? 22;
    this.contentWidth = this.width - 2 * this.padding;
    this.defaultFontFamily = opts.defaultFontFamily ?? DEFAULT_FONT;

    if (Array.isArray(opts.icons)) {
      this.icons = loadPhosphorIcons(opts.icons);
    } else if (opts.icons && typeof opts.icons === 'object') {
      this.icons = { ...opts.icons };
    } else {
      this.icons = {};
    }
  }

  // ------------------------------------------------------------------
  //   Cursor control
  // ------------------------------------------------------------------

  /** Move the Y cursor down by `delta` pixels (negative values move up). */
  advance(delta: number): this {
    this.y += delta;
    return this;
  }

  /** Alias for `advance` with a documented default of 12 px. */
  spacer(amount = 12): this {
    this.y += amount;
    return this;
  }

  // ------------------------------------------------------------------
  //   Primitives
  // ------------------------------------------------------------------

  /**
   * Draw text at the current Y baseline (or at `opts.y` if given).
   * Does NOT advance the cursor — the caller controls vertical rhythm.
   */
  text(content: string, opts: TextOptions = {}): this {
    this.parts.push(
      buildTextFragment(content, this.y, this.defaultFontFamily, {
        ...opts,
        defaultX: opts.x ?? this.padding,
      }),
    );
    return this;
  }

  /**
   * Draw a Phosphor icon (must be pre-loaded into the page's icon map).
   * Icon top-left is placed at (x, y + dy). Common pattern when placing an
   * icon next to text is `dy: -size * 0.8` to visually align with the text baseline.
   */
  icon(name: string, size = 16, opts: IconOptions = {}): this {
    const content = this.icons[name];
    if (!content) return this; // graceful no-op
    const x = opts.x ?? this.padding;
    const dy = opts.dy ?? 0;
    this.parts.push(buildIconFragment(content, x, this.y + dy, size, opts.fill ?? '#000'));
    return this;
  }

  /** Horizontal rule at the current Y. */
  rule(opts: RuleOptions = {}): this {
    this.parts.push(
      buildRuleFragment(this.y, this.padding, this.width - this.padding, opts),
    );
    return this;
  }

  /** Append a raw SVG fragment at the current Y (escape hatch). */
  push(fragment: string): this {
    this.parts.push(fragment);
    return this;
  }

  /**
   * Embed a PNG buffer at (x, y) sized to (width, height). The PNG is
   * encoded as a base64 data URI inside an `<image>` element.
   *
   * NOTE: at render time sharp downsamples the SVG, which would smear an
   * already-dithered raster. For halftone posters use the dedicated
   * `poster()` helper (which composites onto the final raster) — `image()`
   * is for sharp text / vector content already binarised.
   */
  image(pngBuffer: Buffer, opts: ImageOptions = {}): this {
    const x = opts.x ?? this.padding;
    const y = opts.y ?? this.y;
    const w = opts.width;
    const h = opts.height;
    const sizeAttrs = [
      w != null ? `width="${w}"` : '',
      h != null ? `height="${h}"` : '',
    ].filter(Boolean).join(' ');
    const b64 = pngBuffer.toString('base64');
    this.parts.push(
      `<image x="${x}" y="${y}" ${sizeAttrs} preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>`,
    );
    return this;
  }

  // ------------------------------------------------------------------
  //   Composition helpers
  // ------------------------------------------------------------------

  /**
   * Run `fn` in a "row context": the cursor is preserved on exit, so any
   * `text()` / `icon()` calls inside land on the same baseline. Optionally
   * advance the cursor after.
   */
  row(fn: () => void, opts: RowOptions = {}): this {
    const startY = this.y;
    fn();
    this.y = startY + (opts.advance ?? 0);
    return this;
  }

  // ------------------------------------------------------------------
  //   Higher-level patterns
  // ------------------------------------------------------------------

  /**
   * Big centered title with optional italic subtitle below.
   * Advances the cursor past the block.
   */
  title(text: string, opts: { subtitle?: string; size?: number; family?: string; spacing?: number } = {}): this {
    const size = opts.size ?? 50;
    this.text(text, {
      x: this.width / 2,
      anchor: 'middle',
      family: opts.family ?? 'georgia',
      size,
      weight: 700,
      spacing: opts.spacing ?? 10,
    });
    if (opts.subtitle) {
      this.y += Math.round(size * 0.5);
      this.text(opts.subtitle, {
        x: this.width / 2,
        anchor: 'middle',
        size: 14,
        style: 'italic',
        spacing: 3,
      });
    }
    this.y += Math.round(size * 0.5);
    return this;
  }

  /**
   * Section header: optional icon to the left + caps-tracked label.
   * Advances the cursor past the block.
   */
  section(
    label: string,
    opts: { icon?: string; iconSize?: number; size?: number; spacing?: number } = {},
  ): this {
    const size = opts.size ?? 14;
    const iconSize = opts.iconSize ?? Math.round(size * 1.8);
    let textX = this.padding;
    if (opts.icon && this.icons[opts.icon]) {
      this.icon(opts.icon, iconSize, { dy: -Math.round(iconSize * 0.75) });
      textX = this.padding + iconSize + 8;
    }
    this.text(label, {
      x: textX,
      size,
      weight: 700,
      spacing: 3,
    });
    this.y += Math.round(size * 1.6);
    return this;
  }

  // ------------------------------------------------------------------
  //   Text-measurement helpers (proxied to the standalone fns)
  // ------------------------------------------------------------------

  approxWidth(text: string, size: number, opts: TextOptions = {}): number {
    return approxWidth(text, size, { family: resolveFontFamily(opts.family, this.defaultFontFamily), weight: opts.weight });
  }

  wrapByWidth(text: string, maxWidth: number, size: number, opts: TextOptions = {}): string[] {
    return wrapByWidth(text, maxWidth, size, { family: resolveFontFamily(opts.family, this.defaultFontFamily), weight: opts.weight });
  }

  // Re-exposed for users assembling raw fragments via `page.push(...)`.
  escapeXml = escapeXml;

  // ------------------------------------------------------------------
  //   Serialization
  // ------------------------------------------------------------------

  /** Serialise to a complete SVG document at the current Y as height. */
  toSvg(): string {
    const h = this.y;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${h}" viewBox="0 0 ${this.width} ${h}">
<rect width="${this.width}" height="${h}" fill="#fff"/>
${this.parts.join('\n')}
</svg>`;
  }

  /**
   * Rasterise the page to a 1-bit-style PNG, ready for the thermal printer.
   * Renders at high density (so anti-aliasing produces good edges), downsamples
   * to the final width, then thresholds to pure B&W.
   */
  async toPng(opts: RenderOptions = {}): Promise<Buffer> {
    const { default: sharp } = await import('sharp');
    return sharp(Buffer.from(this.toSvg()), { density: opts.density ?? 240 })
      .resize({ width: opts.width ?? this.width, fit: 'inside' })
      .flatten({ background: '#ffffff' })
      .greyscale()
      .threshold(opts.threshold ?? 140)
      .png()
      .toBuffer();
  }

  /**
   * Like `toPng`, but composites a list of already-dithered raster images
   * onto the thresholded base at exact pixel positions. Use for halftone
   * posters that would otherwise be smeared by the master rasterisation.
   */
  async toPngWithImages(
    images: Array<{ data: Buffer; x: number; y: number }>,
    opts: RenderOptions = {},
  ): Promise<Buffer> {
    const { default: sharp } = await import('sharp');
    const base = await this.toPng(opts);
    if (!images.length) return base;
    return sharp(base)
      .composite(images.map(im => ({
        input: im.data,
        left: Math.round(im.x),
        top: Math.round(im.y),
      })))
      .png()
      .toBuffer();
  }

  /** Inspect the accumulated SVG fragments (for testing/debugging). */
  get fragments(): readonly string[] {
    return this.parts;
  }
}
