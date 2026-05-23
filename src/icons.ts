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
 *
 * Resolution note: phosphor's package.json restricts `exports` so that
 * `require.resolve('@phosphor-icons/core/package.json')` fails on modern
 * Node. The only thing the package exports besides `.` is the assets
 * themselves, so we resolve each SVG by its public subpath
 * (`./assets/<weight>/<name>.svg`) and let Node's resolver locate the
 * package wherever it lives in the dependency tree.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

export type PhosphorWeight =
  | 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

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
  try {
    // Resolve via the public exports map. Throws if Phosphor isn't
    // installed or the requested icon doesn't exist.
    const file = require_.resolve(`@phosphor-icons/core/assets/${weight}/${name}.svg`);
    content = readInner(file);
  } catch {
    // swallow — caller sees an empty string (page just skips the icon)
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
