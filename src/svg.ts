/**
 * SVG-fragment helpers used internally by Page. Exposed for callers who want
 * to inject custom shapes via `page.push(rawSvg)`.
 */
import type { TextOptions, RuleOptions } from './types.js';

export const escapeXml = (s: unknown): string =>
  String(s ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string));

/**
 * Resolve a shorthand `family` value (e.g. `'georgia'`) to a CSS font-family stack.
 * Pass-through anything that looks like a real stack already.
 */
export function resolveFontFamily(family: string | undefined, fallback: string): string {
  if (!family) return fallback;
  if (family.includes(',')) return family;
  const map: Record<string, string> = {
    georgia: "Georgia, 'Times New Roman', serif",
    serif: "Georgia, 'Times New Roman', serif",
    helvetica: 'Helvetica, Arial, sans-serif',
    sans: 'Helvetica, Arial, sans-serif',
    mono: "Menlo, Consolas, 'Courier New', monospace",
  };
  return map[family.toLowerCase()] ?? family;
}

/** Naive proportional-font width estimate, good enough for wrap decisions at 10–24 px. */
export function approxWidth(
  text: string,
  size: number,
  opts: { family?: string; weight?: number } = {},
): number {
  const bold = (opts.weight ?? 400) >= 600;
  const serif = /serif|Georgia/i.test(opts.family ?? '');
  const factor = bold ? 0.56 : (serif ? 0.50 : 0.52);
  return text.length * size * factor;
}

/** Word-wrap text to fit within a given pixel width. */
export function wrapByWidth(
  text: string,
  maxWidth: number,
  size: number,
  opts: { family?: string; weight?: number } = {},
): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (approxWidth(test, size, opts) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function buildTextFragment(
  s: string,
  y: number,
  defaultFamily: string,
  o: TextOptions & { defaultX: number } = { defaultX: 0 },
): string {
  const x = o.x ?? o.defaultX;
  const yy = o.y ?? y;
  const anchor = o.anchor ? ` text-anchor="${o.anchor}"` : '';
  const family = resolveFontFamily(o.family, defaultFamily);
  const size = o.size ?? 14;
  const weight = o.weight ?? 400;
  const style = o.style ? ` font-style="${o.style}"` : '';
  const sp = o.spacing ? ` letter-spacing="${o.spacing}"` : '';
  const fill = o.fill ?? '#000';
  return `<text x="${x}" y="${yy}"${anchor} font-family="${family}" font-size="${size}" font-weight="${weight}"${style}${sp} fill="${fill}">${escapeXml(s)}</text>`;
}

export function buildRuleFragment(
  y: number,
  contentX1: number,
  contentX2: number,
  o: RuleOptions = {},
): string {
  const x1 = o.x1 ?? contentX1;
  const x2 = o.x2 ?? contentX2;
  const stroke = o.stroke ?? 1;
  const dash = o.dasharray ? ` stroke-dasharray="${o.dasharray}"` : '';
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000" stroke-width="${stroke}"${dash}/>`;
}

export function buildIconFragment(
  content: string,
  x: number,
  y: number,
  size: number,
  fill = '#000',
): string {
  const scale = size / 256; // Phosphor uses a 256x256 viewBox
  return `<g transform="translate(${x}, ${y}) scale(${scale.toFixed(4)})" fill="${fill}">${content}</g>`;
}
