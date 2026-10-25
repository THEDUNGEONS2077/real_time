/**
 * Check layer: the REDLINE review gallery (out/previews/redline/index.html).
 *
 * It renders every palette, clock font, size and glow, the complication states and
 * the ambient clock for each font, plus a motion loop and the optimized (cached) tree.
 * Ambient coverage is enforced: under 10% of the round screen may light up.
 * These are design previews, not watch measurements.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../compose/src/build.ts';
import { frame } from '../compose/src/core/frame.ts';
import type { Frame } from '../compose/src/core/frame.ts';
import { optionSvg } from '../compose/src/editor/icons.ts';
import { palettes, scene } from '../compose/faces/redline/design.ts';
import { editorSettings } from '../compose/faces/redline/editor.ts';
import { clockSizes, fontIds, glows } from '../compose/faces/redline/fonts.ts';
import { previewSvg } from '../compose/faces/redline/preview.ts';
import { compileWatchface } from '../compose/faces/redline/render.ts';

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

/** Tile PNGs into one contact sheet, `columns` wide, at 432 px per tile. */
async function sheet(files: string[], columns: number, out: string): Promise<void> {
  const rows = Math.ceil(files.length / columns);
  await sharp({ create: { width: columns * 432, height: rows * 432, channels: 3, background: '#08090b' } })
    .composite(files.map((input, i) => ({ input, left: (i % columns) * 432, top: Math.floor(i / columns) * 432 })))
    .png().toFile(out);
}

/** Generate the whole gallery without an HTTP server. */
export async function redlinePreviews(): Promise<void> {
  const out = resolve(root, 'out/previews/redline');
  await mkdir(out, { recursive: true });
  const at = (time: string) => new Date(`2026-10-25T${time}Z`);

  // Named review states. Fonts are shown at Medium + Low glow, then sizes and glows separately.
  const states: [string, Partial<Frame>][] = [
    ['reference', {}],
    ...Object.keys(palettes).filter(k => k !== 'REFERENCE').map(k => [`palette-${k.toLowerCase()}`, { config: { palette: k } }] as [string, Partial<Frame>]),
    ...fontIds.map(font => [`font-${font.toLowerCase()}`, { config: { clock_font: font } }] as [string, Partial<Frame>]),
    ...fontIds.flatMap(font => (Object.keys(clockSizes) as string[]).filter(s => s !== 'MEDIUM').map(size =>
      [`size-${size.toLowerCase()}-${font.toLowerCase()}`, { config: { clock_font: font, clock_size: size }, time: at('08:08:00') }] as [string, Partial<Frame>])),
    ...glows.filter(g => g !== 'LOW').flatMap(glow => ['REDLINE', 'RAJDHANI', 'SEGMENT'].map(font =>
      [`glow-${glow.toLowerCase()}-${font.toLowerCase()}`, { config: { clock_font: font, glow } }] as [string, Partial<Frame>])),
    ['timer-running', { complication: { type: 'SHORT_TEXT', text: '04:32', icon: true } }],
    ['timer-progress', { complication: { type: 'RANGED_VALUE', text: '04:32', value: 272, min: 0, max: 600 } }],
    ['timer-icon', { complication: { type: 'MONOCHROMATIC_IMAGE' } }],
    ['low-battery', { battery: 15 }],
    ['still', { config: Object.fromEntries(['seconds', 'ring_a', 'ring_b', 'breathing', 'scan', 'tilt'].map(e => [e, 'FALSE'])) }],
    ['speed-still', { config: { motion_speed: 'STILL' } }],
    ['dynamic', { config: { motion_style: 'DYNAMIC' } }],
    ['tilt-positive', { tiltX: 3, tiltY: 3 }],
    ['tilt-negative', { tiltX: -3, tiltY: -3 }],
    ['midnight', { time: at('00:00:00') }],
    ['12-hour-noon', { time: at('12:00:00'), hour24: false }],
    ['narrow-digits', { time: at('11:11:00') }],
    ['wide-digits', { time: at('08:08:00') }],
    ['month-wide', { time: new Date('2026-05-27T10:45:00Z'), config: { clock_font: 'CHAKRA' } }],
    ...fontIds.map(font => [`ambient-${font.toLowerCase()}`, { ambient: true, time: at('08:08:00'), config: { clock_font: font } }] as [string, Partial<Frame>]),
  ];

  const cards: string[] = [];
  const ambient: { name: string; litFraction: number }[] = [];
  for (const [name, override] of states) {
    const svg = previewSvg(frame(override));
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(resolve(out, `${name}.png`), png);
    cards.push(`<figure><img src="${name}.png" width="320" height="320" alt="${name}"/><figcaption>${name}</figcaption></figure>`);
    if (override.ambient) {
      const fraction = await litFraction(png);
      ambient.push({ name, litFraction: fraction });
      if (fraction >= 0.10) throw new Error(`REDLINE ambient coverage exceeds 10%: ${name} (${(fraction * 100).toFixed(2)}%).`);
    }
  }
  await writeFile(resolve(out, 'ambient.json'), JSON.stringify({ maxLitFraction: Math.max(...ambient.map(a => a.litFraction)), threshold: 0.10, samples: ambient }, null, 2) + '\n');

  // Contact sheets for quick comparison.
  await sheet(fontIds.map(f => resolve(out, `font-${f.toLowerCase()}.png`)), 4, resolve(out, 'fonts.png'));
  await sheet(['reference', ...Object.keys(palettes).filter(k => k !== 'REFERENCE').map(k => `palette-${k.toLowerCase()}`)].map(n => resolve(out, `${n}.png`)), 3, resolve(out, 'palettes.png'));
  const options = editorSettings.flatMap(s => s.options);
  const tiles = await Promise.all(options.map(async (o, i) => ({ input: await sharp(Buffer.from(optionSvg(o))).png().toBuffer(), left: (i % 8) * 96, top: Math.floor(i / 8) * 96 })));
  await sharp({ create: { width: 768, height: Math.ceil(options.length / 8) * 96, channels: 3, background: '#08090b' } }).composite(tiles).png().toFile(resolve(out, 'editor-options.png'));

  // The optimized tree as packaged: cached layers instead of source vectors.
  const cache = compileWatchface().caches[0];
  const optimized = previewSvg(frame(), { optimized: { nodes: cache.scene(scene()), images: await cache.previewImages() } });
  await sharp(Buffer.from(optimized)).png().toFile(resolve(out, 'optimized.png'));

  // A 4-second motion loop at 30 preview fps. It samples the ideal path; it is not the watch's frame rate.
  const frames: string[] = [];
  for (let i = 0; i < 120; i++) {
    const name = `motion-${String(i).padStart(3, '0')}.svg`;
    await writeFile(resolve(out, name), previewSvg(frame({ time: new Date(at('10:45:00').getTime() + i * 1000 / 30) })));
    frames.push(name);
  }

  // Optional side-by-side with the user's reference artwork (never packaged).
  const reference = '/mnt/c/Users/57298327/Desktop/GENS/Dungeons Cyberpunk HUD Watch Face.png';
  let comparison = '';
  try {
    const source = await readFile(reference);
    const meta = await sharp(source).metadata(), size = Math.min(meta.width!, meta.height!);
    await sharp(source).extract({ left: Math.floor((meta.width! - size) / 2), top: Math.floor((meta.height! - size) / 2), width: size, height: size }).resize(432, 432).png().toFile(resolve(out, 'reference-aligned.png'));
    comparison = '<figure><img src="reference-aligned.png" width="432" height="432" alt="reference"/><figcaption>Aligned user reference</figcaption></figure>';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>REDLINE review</title>
<style>body{background:#08090b;color:#edf0f1;font:14px monospace;margin:28px}main,.compare{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}figcaption{padding:12px}button{background:#111;color:#eee;border:1px solid #ff202b;padding:10px}a{color:#ff6470}</style>
<h1>REAL_TIME / REDLINE 1.0</h1><p>Design previews. Delivered smoothness and battery cost are measured on the watch.</p>
<div class="compare">${comparison}<figure><img id="motion" src="${frames[0]}" width="432" height="432" alt="motion"><figcaption>4-second sample at 30 preview fps. <button id="pause">Pause</button></figcaption></figure></div>
<p><a href="fonts.png">All fonts</a> · <a href="palettes.png">All palettes</a> · <a href="editor-options.png">Editor option icons</a> · <a href="optimized.png">Optimized layers</a></p>
<main>${cards.join('')}</main>
<script>const frames=${JSON.stringify(frames)};let i=0,play=true;document.getElementById('pause').onclick=()=>{play=!play;document.getElementById('pause').textContent=play?'Pause':'Play'};setInterval(()=>{if(play)document.getElementById('motion').src=frames[++i%frames.length]},1000/30)</script></html>`;
  await writeFile(resolve(out, 'index.html'), html);
  console.log(`REDLINE previews: ${out}/index.html (ambient max ${(Math.max(...ambient.map(a => a.litFraction)) * 100).toFixed(2)}%)`);
}

// Allow running this gallery alone: node tools/check/redline.ts
if (process.argv[1]?.endsWith('redline.ts')) await redlinePreviews();
