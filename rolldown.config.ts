import { defineConfig } from 'rolldown';

/**
 * Library build:
 *   - Bundle each public entry point separately so users can deep-import.
 *   - ESM output (the default).
 *   - Runtime deps stay external — they're peer-installable.
 */
export default defineConfig({
  input: {
    index: 'src/index.ts',
    printer: 'src/printer.ts',
    icons: 'src/icons.ts',
    dither: 'src/dither.ts',
  },
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  external: [
    'sharp',
    'node-thermal-printer',
    '@phosphor-icons/core',
    /^node:/,
  ],
  platform: 'node',
});
