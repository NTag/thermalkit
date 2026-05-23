/**
 * Halftone poster pipeline: URL → 1-bit dithered PNG, ready to composite onto
 * a rasterised page.
 *
 * Steps:
 *   1. Download bytes (with optional User-Agent).
 *   2. Resize to the exact target display size (no scaling during render).
 *   3. CLAHE for local contrast (rescues dark posters), then normalize.
 *   4. Dither (Atkinson by default).
 *   5. Re-encode as a clean greyscale PNG with exactly 0 / 255 values.
 *
 * The output PNG is at the EXACT pixel dimensions you'll display it at on
 * the page — no further scaling. That's the trick that keeps the dot
 * pattern crisp through the master rasterisation step (use `page.toPngWithImages`).
 */
import { dither as runDither } from './dither.js';
import type { PosterOptions, PreparedImage } from './types.js';

const DEFAULT_USER_AGENT = 'thermalkit/0.1';

export async function preparePoster(
  url: string,
  opts: PosterOptions = {},
): Promise<PreparedImage> {
  const { default: sharp } = await import('sharp');

  const res = await fetch(url, {
    headers: { 'User-Agent': opts.userAgent ?? DEFAULT_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Poster HTTP ${res.status} (${url})`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Compute the exact target H/W from the source aspect ratio.
  const meta = await sharp(buf).metadata();
  const ratio = (meta.height ?? 1) / (meta.width ?? 1);
  const displayW = opts.width ?? 100;
  const displayH = Math.round(displayW * ratio);

  let pipeline = sharp(buf)
    .resize({ width: displayW, height: displayH, fit: 'fill' })
    .greyscale();

  const contrast = opts.contrast ?? 'clahe';
  if (contrast === 'clahe') {
    pipeline = pipeline.clahe({ width: 8, height: 8, maxSlope: 3 }).normalize();
  } else if (contrast === 'normalize') {
    pipeline = pipeline.normalize();
  }

  const { data: grey, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  const algo = opts.dither ?? 'atkinson';
  const dithered = runDither(algo, grey, info.width, info.height);

  const { data, info: outInfo } = await sharp(Buffer.from(dithered.buffer), {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });

  return { data, width: outInfo.width, height: outInfo.height };
}
