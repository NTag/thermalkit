/**
 * Thin loader for Phosphor icons (`@phosphor-icons/core`).
 *
 * The package ships per-icon `.svg` files at:
 *   assets/<weight>/<name>.svg
 *
 * We read each file once, extract the inner SVG content (everything between
 * `<svg …>` and `</svg>`), and cache it so subsequent loads are free.
 *
 * The Page builder embeds this content via:
 *   <g transform="translate(x, y) scale(s)" fill="#000">{content}</g>
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

export type PhosphorWeight =
  | 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

// Resolve the package once. Fall back gracefully if Phosphor isn't installed.
let phosphorAssetsDir: string | null = null;
try {
  const pkgPath = require_.resolve('@phosphor-icons/core/package.json');
  phosphorAssetsDir = path.join(path.dirname(pkgPath), 'assets');
} catch {
  phosphorAssetsDir = null;
}

const cache = new Map<string, string>();

function readInner(filePath: string): string {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  return m ? m[1].trim() : '';
}

/**
 * Load a single Phosphor icon's inner SVG.
 * Returns `''` if the icon (or Phosphor itself) is unavailable.
 */
export function loadIcon(name: string, weight: PhosphorWeight = 'regular'): string {
  const key = `${weight}/${name}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let content = '';
  if (phosphorAssetsDir) {
    const file = path.join(phosphorAssetsDir, weight, `${name}.svg`);
    if (existsSync(file)) {
      try { content = readInner(file); } catch { /* swallow */ }
    }
  }
  cache.set(key, content);
  return content;
}

/**
 * Load multiple icons into a `name → content` map suitable for `new Page({ icons })`.
 */
export function loadIcons(
  names: string[],
  weight: PhosphorWeight = 'regular',
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) out[n] = loadIcon(n, weight);
  return out;
}
