/**
 * Editor and packaging regressions: the release checker, option icons, cached layers and pixel comparison.
 * These exercise the real generated resources and the selected WFF branches.
 */
import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../src/build.ts';
import { frame } from '../src/core/frame.ts';
import { nodeSvg } from '../src/svg/nodes.ts';
import { maskImages } from '../faces/redline/assets.ts';
import { palettes, scene } from '../faces/redline/design.ts';
import { editorSettings } from '../faces/redline/editor.ts';
import { compileWatchface } from '../faces/redline/render.ts';

const exec = promisify(execFile);
const res = resolve(root, 'faces/redline/src/main/res');
const checker = resolve(root, 'tools/check/verify_editor.py');

it('passes the release checker across every setting option, clock and motion combination', async () => {
  const result = await exec('python3', ['-I', checker, '--resources', res]);
  expect(JSON.parse(result.stdout)).toMatchObject({ settings: 12, editorOptions: 39, packaged: false });
  expect(JSON.parse(result.stdout).states).toBeGreaterThan(1000);
}, 30000);

it('rejects missing icons, nested selectors and mis-sized glyph boxes', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'real-time-editor-'));
  try {
    await mkdir(resolve(directory, 'raw'));
    await symlink(resolve(res, 'values'), resolve(directory, 'values'));
    await symlink(resolve(res, 'drawable-nodpi'), resolve(directory, 'drawable-nodpi'));
    const source = await readFile(resolve(res, 'raw/watchface.xml'), 'utf8');
    const broken = [
      source.replace('icon="editor_palette_reference"', ''),
      source.replace('<Scene backgroundColor="#000000">', '<Scene backgroundColor="#000000"><Group name="bad" x="0" y="0" width="432" height="432"><ListConfiguration id="palette"/></Group>'),
      source.replace(/(<Character name="0" resource="clock_redline_low_0" width=")74"/, '$175"'),
    ];
    for (const changed of broken) {
      expect(changed).not.toBe(source);
      await writeFile(resolve(directory, 'raw/watchface.xml'), changed);
      await expect(exec('python3', ['-I', checker, '--resources', directory])).rejects.toMatchObject({ code: 1 });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

it('ships visible, compact, distinct option icons', async () => {
  const distinct = new Map<string, Set<string>>();
  for (const s of editorSettings) for (const option of s.options) {
    const data = await readFile(resolve(res, `drawable-nodpi/${option.icon}.png`));
    const { data: pixels, info } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([96, 96]);
    expect(data.length).toBeLessThan(16384);
    let bright = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 300) bright++;
    expect(bright, option.icon).toBeGreaterThan(200);
    const set = distinct.get(s.id) ?? new Set();
    set.add(data.toString('base64'));
    distinct.set(s.id, set);
  }
  // Every option of a setting looks different from its siblings.
  for (const s of editorSettings) expect(distinct.get(s.id)!.size, s.id).toBe(s.options.length);
});

it('keeps source geometry and colour after caching, including motion and tilt', async () => {
  const compiled = compileWatchface();
  const ids = Object.keys(palettes) as (keyof typeof palettes)[];
  for (const [i, cache] of compiled.caches.entries()) {
    const palette = palettes[ids[i]];
    const images = { ...maskImages(palette), ...await cache.previewImages() };
    for (const [speed, style] of [['STANDARD', 'SMOOTH'], ['FAST', 'DYNAMIC']] as const) {
      const f = frame({ time: new Date('2026-10-25T23:59:07.500Z'), tiltX: 3, tiltY: -3 });
      const original = scene(speed, style), cached = cache.scene(original);
      const raster = (nodes: typeof original) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect width="432" height="432" fill="#030405"/>${nodes.map(n => nodeSvg(n, f, palette, images)).join('')}</svg>`)).removeAlpha().raw().toBuffer();
      const [a, b] = await Promise.all([raster(original), raster(cached)]);
      let difference = 0;
      for (let p = 0; p < a.length; p++) difference += Math.abs(a[p] - b[p]);
      // Cached masks are rasterized once and then rotated, so subpixel antialiasing can differ slightly.
      expect(difference / a.length, `${ids[i]} ${speed} ${style}`).toBeLessThan(1.5);
    }
  }
}, 60000);

it('shares identical neutral layers across palettes instead of packaging copies', () => {
  const caches = compileWatchface().caches;
  const shared = [...caches[0].layers.keys()].filter(key => caches.every(c => c.layers.has(key)));
  expect(shared.length).toBeGreaterThan(0);
  const references = caches.reduce((n, c) => n + c.layers.size, 0);
  expect(new Set(caches.flatMap(c => [...c.layers.keys()])).size).toBeLessThan(references);
});

it('accepts PNG recompression but rejects altered packaged pixels', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'real-time-pixels-'));
  try {
    const raw = Buffer.from([25, 80, 130, 255]);
    const image = sharp(raw, { raw: { width: 1, height: 1, channels: 4 } }), source = resolve(directory, 'source.png');
    await image.clone().png({ compressionLevel: 9 }).toFile(source);
    const same = await image.clone().png({ compressionLevel: 0 }).toBuffer();
    const other = await sharp(Buffer.from([25, 80, 131, 255]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    for (const [buffer, ok] of [[same, true], [other, false]] as const) {
      const manifest = resolve(directory, 'pair.json');
      await writeFile(manifest, JSON.stringify([{ name: 'test', source, packaged: buffer.toString('base64') }]));
      const command = exec('node', [resolve(root, 'tools/check/image-pixels.mjs'), manifest]);
      if (ok) await expect(command).resolves.toMatchObject({ stderr: '' });
      else await expect(command).rejects.toMatchObject({ code: 1 });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
