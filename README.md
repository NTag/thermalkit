# thermalkit

Compose nicely-typeset images for thermal receipt printers (Epson TM-T88VI and friends).

Designed for 80 mm thermal paper at 180 dpi — the canonical 504-pixel-wide vertical strip. Use it to build daily briefings, ticket lineups, schedules, weather forecasts, or anything that fits a single-column receipt layout.

## Install

```bash
npm install thermalkit
```

If you want to print (not just generate images), install the printer dependency along with it:

```bash
npm install thermalkit node-thermal-printer
```

## Quick start

```js
import { Page } from 'thermalkit';
import { EpsonPrinter } from 'thermalkit/printer';

const page = new Page({
  width: 504,                            // px (TM-T88VI printable area)
  icons: ['sun', 'wind', 'drop'],        // Phosphor icons, pre-loaded
});

page.advance(60);
page.title('BERLIN', { subtitle: 'morning briefing' });
page.rule({ stroke: 1.5 });

page.advance(36);
page.section('MÉTÉO', { icon: 'sun' });

page.text('21° / 14°', { family: 'georgia', size: 32 });
page.advance(28);

page.row(() => {
  page.icon('wind', 16, { dy: -12 });
  page.text('15 km/h SW', { x: 38 });
});

const png = await page.toPng();
await new EpsonPrinter({ host: '192.168.0.225' }).print(png);
```

## API

### `new Page(options)`

Construct a vertical layout buffer.

| option | type | default | meaning |
|---|---|---|---|
| `width` | `number` | `504` | Output width in pixels. Must be a multiple of 8 (ESC/POS bitmap requirement). |
| `padding` | `number` | `22` | Horizontal padding around the content area. |
| `icons` | `string[]` \| `Record<string,string>` | `{}` | Either a list of Phosphor icon names to pre-load, or a name→SVG-inner-content map. |
| `defaultFontFamily` | `string` | `Helvetica, Arial, sans-serif` | Used by `page.text()` when no family is given. |

### Cursor control

| method | what it does |
|---|---|
| `page.y` | Read or write the current Y cursor (mutable property). |
| `page.advance(delta)` | Move the cursor down by `delta` pixels. |
| `page.spacer(amount = 12)` | Alias for `advance` with a documented default. |

### Primitives (all chainable)

| method | what it draws |
|---|---|
| `page.text(content, opts?)` | Text at the current baseline. Does **not** auto-advance. |
| `page.icon(name, size?, opts?)` | Phosphor icon (must be pre-loaded). |
| `page.rule(opts?)` | Horizontal line at the current Y. |
| `page.image(pngBuffer, opts?)` | Embed a raster image (use `preparePoster` for halftone photos). |
| `page.push(svgFragment)` | Append raw SVG (escape hatch for custom shapes). |
| `page.row(fn, opts?)` | Run `fn` with the cursor preserved — multiple `text` / `icon` calls land on the same baseline. |

### Higher-level helpers

| method | what it draws |
|---|---|
| `page.title(text, { subtitle?, size?, family? })` | Big centered title + optional italic subtitle. |
| `page.section(label, { icon?, size? })` | Caps-tracked section header, with optional icon on the left. |

### Text-measurement

```js
page.approxWidth(text, size, opts?);
page.wrapByWidth(text, maxWidth, size, opts?);
```

Naive but cheap. Good enough for word-wrapping decisions in the 10-24 px font-size range.

### Output

```js
const svg = page.toSvg();                  // raw SVG string
const png = await page.toPng();            // 1-bit-style PNG buffer
const png = await page.toPng({             // override raster params
  density: 240, width: 504, threshold: 140,
});
```

For halftone photos (posters), use `toPngWithImages` to composite dithered rasters onto the thresholded base — that avoids the dither pattern getting smeared during the master rasterisation step:

```js
import { Page, preparePoster } from 'thermalkit';

const page = new Page({ width: 504 });
// ...
const posterY = page.y;
page.advance(150);  // reserve space

const poster = await preparePoster('https://example.com/poster.jpg', {
  width: 100,
  dither: 'atkinson',
});
const png = await page.toPngWithImages([
  { data: poster.data, x: 22, y: posterY },
]);
```

## Printer

```js
import { EpsonPrinter } from 'thermalkit/printer';

const printer = new EpsonPrinter({ host: '192.168.0.225', port: 9100 });

await printer.print(png, {
  density: 0,           // -50..+50, persistent in printer memory
  cut: true,            // paper cut at end
  align: 'center',
});

await printer.setDensity(20);              // change density without printing
await printer.raw(Buffer.from([0x1b, 0x40])); // send arbitrary ESC/POS
```

## Dithering

The poster pipeline uses Atkinson dither by default — cleaner contrast than Floyd-Steinberg, less speckle than ordered Bayer. You can call the algorithms directly too:

```js
import { atkinson, floydSteinberg, bayer, threshold } from 'thermalkit/dither';

const out = atkinson(greyBytes, width, height);  // Uint8Array (0 or 255)
```

| algorithm | character | best for |
|---|---|---|
| `atkinson` | clean, high contrast, less speckle | posters, faces, illustrations |
| `floydSteinberg` | photographic, more detail, more noise | photographs at large sizes |
| `bayer` | regular cross-hatch pattern | when you want a "computer-print" aesthetic |
| `threshold` | hard B&W, no halftone | text, line art, icons |

## Icons

The library ships with Phosphor icon loading out of the box. Pass icon names to the `Page` constructor:

```js
const page = new Page({
  icons: ['sun', 'cloud-rain', 'wind', 'calendar-heart'],
});
```

You can also load them yourself:

```js
import { loadIcon, loadIcons } from 'thermalkit/icons';

const sun = loadIcon('sun');              // inner SVG content (string)
const map = loadIcons(['sun', 'wind']);   // name → content
const map2 = loadIcons(['sun'], 'bold');  // different Phosphor weight
```

If `@phosphor-icons/core` isn't installed, icon loading silently returns empty strings (and `page.icon()` becomes a no-op).

## License

MIT
