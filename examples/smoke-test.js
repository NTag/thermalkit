/**
 * Run with: node examples/smoke-test.js
 * Builds a short page, writes a PNG to /tmp/thermalkit-smoke.png, prints nothing.
 */
import { Page, preparePoster } from '../dist/index.js';
import { writeFileSync } from 'node:fs';

const page = new Page({
  width: 504,
  icons: ['sun', 'wind', 'drop', 'sun-horizon', 'calendar-heart'],
});

page.advance(60);
page.title('THERMALKIT', { subtitle: 'smoke test · v0.1', size: 44 });
page.rule({ stroke: 1.5 });

page.advance(36);
page.section('MÉTÉO', { icon: 'sun' });

page.row(() => {
  page.text('21°', { family: 'georgia', size: 44 });
  page.text('/ 14°', { x: 110, family: 'georgia', size: 22 });
});
page.advance(28);

page.text('Couvert', { weight: 500 });
page.advance(24);

page.row(() => {
  page.icon('wind', 16, { dy: -12 });
  page.text('15 km/h SW', { x: 24 + 14 });
});
page.advance(22);

page.row(() => {
  page.icon('drop', 16, { dy: -12 });
  page.text('max 20% pluie', { x: 24 + 14 });
});
page.advance(22);

page.row(() => {
  page.icon('sun-horizon', 16, { dy: -12 });
  page.text('05:18 → 21:14', { x: 24 + 14 });
});
page.advance(28);
page.rule();

page.advance(36);
page.section('AGENDA', { icon: 'calendar-heart' });
page.text('10:00  Standup', { size: 14, family: 'georgia' });
page.advance(20);
page.text('19:00  Apéro chez Léa', { size: 14, family: 'georgia' });
page.advance(36);

page.rule({ stroke: 1.5 });
page.advance(26);
page.text('thermalkit v0.1 · imperative API smoke test', {
  x: page.width / 2,
  anchor: 'middle',
  size: 10,
  style: 'italic',
});
page.advance(30);

const png = await page.toPng();
writeFileSync('/tmp/thermalkit-smoke.png', png);
console.log(`Wrote /tmp/thermalkit-smoke.png (${png.length} bytes, ${page.y}px tall)`);
