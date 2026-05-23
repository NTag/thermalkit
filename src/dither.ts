/**
 * 1-bit dithering algorithms.
 *
 * All three take a single-channel greyscale `Uint8Array` (one byte per pixel,
 * 0 = black, 255 = white) and return another `Uint8Array` of the same size
 * containing exclusively 0 or 255 values.
 *
 * Pick by use case:
 *   - **atkinson** — default; cleaner / higher contrast / less speckle. Loses
 *     detail in extreme dark/light. Best for posters, faces, illustrations.
 *   - **fs** (Floyd-Steinberg) — preserves the most photographic detail but
 *     produces visible noise at small sizes.
 *   - **bayer** — fastest, regular cross-hatch pattern. Good when you want a
 *     deliberate "computer-print" look.
 *
 * See the README for a side-by-side comparison.
 */

/**
 * Floyd-Steinberg error-diffusion dither.
 * Right 7/16, down-left 3/16, down 5/16, down-right 1/16.
 */
export function floydSteinberg(
  grey: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const work = new Float32Array(grey.length);
  for (let i = 0; i < grey.length; i++) work[i] = grey[i];
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = work[i];
      const nv = v < 128 ? 0 : 255;
      out[i] = nv;
      const err = v - nv;
      if (x + 1 < width)                   work[i + 1]         += err * (7 / 16);
      if (x > 0 && y + 1 < height)         work[i + width - 1] += err * (3 / 16);
      if (y + 1 < height)                  work[i + width]     += err * (5 / 16);
      if (x + 1 < width && y + 1 < height) work[i + width + 1] += err * (1 / 16);
    }
  }
  return out;
}

/**
 * Atkinson dither — used by Apple's original Macintosh. Propagates only 6/8
 * of the error across 6 neighbours (the rest is discarded), giving higher
 * contrast and less speckle than Floyd-Steinberg.
 */
export function atkinson(
  grey: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const work = new Float32Array(grey.length);
  for (let i = 0; i < grey.length; i++) work[i] = grey[i];
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = work[i];
      const nv = v < 128 ? 0 : 255;
      out[i] = nv;
      const err = (v - nv) / 8;
      if (x + 1 < width)                   work[i + 1]              += err;
      if (x + 2 < width)                   work[i + 2]              += err;
      if (y + 1 < height) {
        if (x > 0)                         work[i + width - 1]      += err;
                                           work[i + width]          += err;
        if (x + 1 < width)                 work[i + width + 1]      += err;
      }
      if (y + 2 < height)                  work[i + 2 * width]      += err;
    }
  }
  return out;
}

const BAYER_8 = new Uint8Array([
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]);

/**
 * 8×8 Bayer ordered dither. Deterministic, fast, and produces a regular
 * cross-hatch pattern at low resolutions.
 */
export function bayer(
  grey: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = ((BAYER_8[(y & 7) * 8 + (x & 7)] + 0.5) / 64) * 255;
      out[y * width + x] = grey[y * width + x] < t ? 0 : 255;
    }
  }
  return out;
}

/**
 * Threshold ("hard binarization") — no halftone, every pixel is either 0 or 255
 * based on whether it's above or below `threshold`. Use for line art / text,
 * not for photographs.
 */
export function threshold(
  grey: Uint8Array,
  width: number,
  height: number,
  cutoff = 128,
): Uint8Array {
  const out = new Uint8Array(grey.length);
  for (let i = 0; i < grey.length; i++) out[i] = grey[i] < cutoff ? 0 : 255;
  return out;
}

import type { DitherAlgorithm } from './types.js';

export function dither(
  algo: DitherAlgorithm,
  grey: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  switch (algo) {
    case 'fs':       return floydSteinberg(grey, width, height);
    case 'bayer':    return bayer(grey, width, height);
    case 'none':     return threshold(grey, width, height);
    case 'atkinson':
    default:         return atkinson(grey, width, height);
  }
}
