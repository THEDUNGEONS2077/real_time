/**
 * Check layer: the JARVIS review gallery (out/previews/jarvis/index.html).
 *
 * Renders every palette, font, size and glow, each effect off, the Timer states and the
 * ambient clock per font and palette, plus a motion loop. Ambient coverage is enforced
 * (under 10% of the round screen lit). These are design previews, not watch measurements.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../compose/src/build.ts';
import { frame } from '../compose/src/core/frame.ts';
import type { Frame } from '../compose/src/core/frame.ts';
import { optionSvg } from '../compose/src/editor/icons.ts';
import { clockSizes, glows } from '../compose/src/fonts/catalog.ts';
import { effects, palettes, speeds } from '../compose/faces/jarvis/design.ts';
import { jarvisFonts, editorSettings } from '../compose/faces/jarvis/editor.ts';
import { previewSvg } from '../compose/faces/jarvis/preview.ts';

/** Fraction of the round screen with any lit pixel. */
async function litFraction(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let lit = 0, total = 0;
  for (let y = 0; y < 432; y++) for (let x = 0; x < 432; x++) {
    if (Math.hypot(x + 0.5 - 216, y + 0.5 - 216) > 216) continue;
    const p = (y * 432 + x) * info.channels;
    total++;
    if (data[p] + data[p + 1] + data[p + 2] > 0) lit++;
  }
  return lit / total;
}

/** Tile PNGs into one contact sheet. */
async function sheet(files: string[], columns: number, out: string): Promise<void> {
  const rows = Math.ceil(files.length / columns);
  await sharp({ create: { width: columns * 432, height: rows * 432, channels: 3, background: '#060b10' } })
    .composite(files.map((input, i) => ({ input, left: (i % columns) * 432, top: Math.floor(i / columns) * 432 })))
    .png().toFile(out);
}

/** Generate the whole gallery without an HTTP server. */
export async function jarvisPreviews(): Promise<void> {
  const out = resolve(root, 'out/previews/jarvis');
  await mkdir(out, { recursive: true });
  const at = (time: string) => new Date(`2026-10-30T${time}Z`);
  const named = <T extends string>(prefix: string, ids: readonly T[], make: (id: T) => Partial<Frame>) =>
    ids.map(id => [`${prefix}-${id.toLowerCase()}`, make(id)] as [string, Partial<Frame>]);

  const states: [string, Partial<Frame>][] = [
    ['default', {}],
    ...named('palette', Object.keys(palettes) as (keyof typeof palettes)[], id => ({ config: { palette: id } })),
    ...named('font', jarvisFonts, id => ({ config: { clock_font: id } })),
    ...named('size', Object.keys(clockSizes) as (keyof typeof clockSizes)[], id => ({ config: { clock_size: id }, time: at('08:08:00') })),
    ...named('glow', glows, id => ({ config: { glow: id } })),
    ...named('off', effects, id => ({ config: { [id]: 'FALSE' } })),
    ...named('speed', Object.keys(speeds) as (keyof typeof speeds)[], id => ({ config: { motion_speed: id } })),
    ['all-effects-off', { config: Object.fromEntries(effects.map(id => [id, 'FALSE'])) }],
    ['still', { config: { motion_speed: 'STILL' } }],
    ['timer-running', { complication: { type: 'SHORT_TEXT', text: '04:32', icon: true } }],
    ['timer-progress', { complication: { type: 'RANGED_VALUE', text: '04:32', value: 272, min: 0, max: 600 } }],
    ['low-battery', { battery: 12 }],
    ['12-hour', { time: at('00:05:00'), hour24: false }],
    ['midnight', { time: at('00:00:00') }],
    ...[4, 8, 12, 16, 24, 32, 48].map(t => [`motion-pose-${t}`, { time: new Date(at('10:45:00').getTime() + t * 1000) }] as [string, Partial<Frame>]),
    ...named('ambient', jarvisFonts, id => ({ ambient: true, time: at('08:08:00'), config: { clock_font: id } })),
  ];

  const cards: string[] = [];
  // Reference comparison is local-only; never copy the supplied image into an
  // APK or commit it. Its central instrument is near (435,355), radius ~350.
  try {
    const source = await readFile('/mnt/c/Users/57298327/Desktop/DL/JARVIS.png');
    await sharp(source).extract({ left: 80, top: 0, width: 710, height: 710 })
      .resize(432, 432).png().toFile(resolve(out, 'reference-aligned.png'));
    cards.push('<figure><img src="reference-aligned.png" width="320" height="320" alt="Aligned supplied JARVIS reference"/><figcaption>Reference: aligned central instrument; inspiration, not a pixel reproduction</figcaption></figure>');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const ambient: { name: string; litFraction: number }[] = [];
  for (const [name, override] of states) {
    const png = await sharp(Buffer.from(await previewSvg(frame({ time: at('10:45:00'), ...override })))).png().toBuffer();
    await writeFile(resolve(out, `${name}.png`), png);
    cards.push(`<figure><img src="${name}.png" width="320" height="320" alt="${name}"/><figcaption>${name}</figcaption></figure>`);
    if (override.ambient) {
      const fraction = await litFraction(png);
      ambient.push({ name, litFraction: fraction });
      if (fraction >= 0.10) throw new Error(`JARVIS ambient coverage exceeds 10%: ${name}.`);
    }
  }
  await writeFile(resolve(out, 'ambient.json'), JSON.stringify({ maxLitFraction: Math.max(...ambient.map(a => a.litFraction)), threshold: 0.10, samples: ambient }, null, 2) + '\n');
  await sheet(Object.keys(palettes).map(id => resolve(out, `palette-${id.toLowerCase()}.png`)), 4, resolve(out, 'palettes.png'));
  await sheet(jarvisFonts.map(id => resolve(out, `font-${id.toLowerCase()}.png`)), 4, resolve(out, 'fonts.png'));
  const options = editorSettings.flatMap(s => s.options);
  const tiles = await Promise.all(options.map(async (o, i) => ({ input: await sharp(Buffer.from(optionSvg(o))).png().toBuffer(), left: (i % 8) * 96, top: Math.floor(i / 8) * 96 })));
  await sharp({ create: { width: 768, height: Math.ceil(options.length / 8) * 96, channels: 3, background: '#060b10' } }).composite(tiles).png().toFile(resolve(out, 'editor-options.png'));

  // A 4-second motion loop at 30 preview fps (the ideal path, not the watch's delivered rate).
  const frames: string[] = [];
  for (let i = 0; i < 120; i++) {
    const name = `motion-${String(i).padStart(3, '0')}.svg`;
    await writeFile(resolve(out, name), await previewSvg(frame({ time: new Date(at('10:45:00').getTime() + i * 1000 / 30) })));
    frames.push(name);
  }

  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>JARVIS review</title>
<style>body{background:#060b10;color:#e6f6fa;font:14px monospace;margin:28px}main{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}figcaption{padding:12px}button{background:#0a171e;color:#e6f6fa;border:1px solid #6fd0e6;padding:10px}a{color:#6fd0e6}</style>
<h1>REAL_TIME / JARVIS</h1><p>Design previews. Smoothness and battery are judged on the watch.</p>
<figure><img id="motion" src="${frames[0]}" width="432" height="432" alt="motion"><figcaption>4-second sample at 30 preview fps. <button id="pause">Pause</button></figcaption></figure>
<p><a href="palettes.png">All palettes</a> · <a href="fonts.png">All fonts</a> · <a href="editor-options.png">Editor option icons</a></p>
<main>${cards.join('')}</main>
<script>const frames=${JSON.stringify(frames)};let i=0,play=true;document.getElementById('pause').onclick=()=>{play=!play;document.getElementById('pause').textContent=play?'Pause':'Play'};setInterval(()=>{if(play)document.getElementById('motion').src=frames[++i%frames.length]},1000/30)</script></html>`;
  await writeFile(resolve(out, 'index.html'), html);
  console.log(`JARVIS previews: ${out}/index.html (ambient max ${(Math.max(...ambient.map(a => a.litFraction)) * 100).toFixed(2)}%)`);
}

// Allow running this gallery alone: node tools/check/jarvis.ts
if (process.argv[1]?.endsWith('jarvis.ts')) await jarvisPreviews();
