/**
 * thermalkit — compose 1-bit images for thermal receipt printers.
 *
 * Quick start:
 *
 *   import { Page } from 'thermalkit';
 *   import { EpsonPrinter } from 'thermalkit/printer';
 *
 *   const page = new Page({ width: 504, icons: ['sun', 'wind'] });
 *   page.title('BERLIN', { subtitle: 'morning briefing' });
 *   page.rule();
 *   page.section('MÉTÉO', { icon: 'sun' });
 *   page.text('21° / 14°', { size: 32, family: 'georgia' });
 *
 *   const png = await page.toPng();
 *   await new EpsonPrinter({ host: '192.168.0.225' }).print(png);
 */

export { Page } from './page.js';
export { preparePoster } from './poster.js';
export { loadIcon, loadIcons } from './icons.js';
export {
  escapeXml,
  approxWidth,
  wrapByWidth,
} from './svg.js';

export type {
  PageOptions,
  TextOptions,
  IconOptions,
  RuleOptions,
  RowOptions,
  ImageOptions,
  RenderOptions,
  PosterOptions,
  PreparedImage,
  DitherAlgorithm,
  FontFamily,
  Align,
} from './types.js';
