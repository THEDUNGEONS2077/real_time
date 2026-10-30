/**
 * JARVIS contracts: bounded artwork, resume-safe motion, exact packed pixels,
 * readable time and a compact editor built on the accepted NEXUS architecture.
 * These host checks do not establish phone latency or delivered watch FPS.
 */
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { build, root } from '../src/build.ts';
import { value } from '../src/core/expr.ts';
import { frame } from '../src/core/frame.ts';
import { selectNodes } from '../src/core/scene.ts';
import type { Group, Node } from '../src/core/scene.ts';
import { clockFace, clockSizes } from '../src/fonts/catalog.ts';
import { textWidth } from '../src/fonts/glyphs.ts';
import { nodeSvg } from '../src/svg/nodes.ts';
import { nodeXml } from '../src/wff/nodes.ts';
import { clockScale, effects, layout, masks, palettes, scene } from '../faces/jarvis/design.ts';
import { jarvisFonts } from '../faces/jarvis/editor.ts';
import { artwork } from '../faces/jarvis/artwork.ts';
import { maskSvgs } from '../faces/jarvis/masks.ts';
import { compileWatchface } from '../faces/jarvis/render.ts';

const exec = promisify(execFile);
const at = (ms: number) => frame({ time: new Date(Date.UTC(2026, 9, 30) + ms) });
const flat = (nodes: Node[]): Node[] => nodes.flatMap(n =>
  n.kind === 'group' ? [n, ...flat(n.children)] : n.kind === 'switch' ? flat(n.on) : [n]);
const groups = (nodes: Node[]) => flat(nodes).filter((n): n is Group => n.kind === 'group');
const delta = (a: number, b: number) => (b - a + 540) % 360 - 180;

it('keeps independent rotation rates, true seconds and continuous midnight phases', async () => {
  const rates = { outer_rotor: 6, inner_rotor: -3.75, radar_sweep: 7.5, seconds_mark: 6 };
  for (const [speed, multiplier] of [['SLOW', 1], ['STANDARD', 2], ['FAST', 4]] as const) {
    for (const group of groups(scene(speed))) {
      if (group.angle === undefined) continue;
      const rate = delta(value(group.angle, at(12340)), value(group.angle, at(12350))) / 0.01;
      expect(rate).toBeCloseTo(rates[group.name as keyof typeof rates] * (group.name === 'seconds_mark' ? 1 : multiplier), 6);
      expect(Math.abs(delta(value(group.angle, at(86399990)), value(group.angle, at(86400000))))).toBeLessThan(0.31);
    }
    const pulse = groups(scene(speed)).find(g => g.name === 'core_glow')!;
    for (let ms = 0; ms < 16000; ms += 37) {
      expect(value(pulse.alpha!, at(ms))).toBeGreaterThanOrEqual(115);
      expect(value(pulse.alpha!, at(ms))).toBeLessThanOrEqual(195);
    }
  }
  expect(await compileWatchface()).not.toContain('<Animation');
});

it('removes all decorative time sources when disabled or Still', () => {
  const off = Object.fromEntries(effects.map(e => [e, 'FALSE']));
  for (const nodes of [scene('STILL'), selectNodes(scene(), off)]) {
    expect(nodes.map(n => nodeXml(n, palettes.CYAN)).join('')).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|<Animation/);
  }
});

it('keeps every illuminated mask pixel including glow inside the six-unit margin', async () => {
  for (const [name, svg] of Object.entries(maskSvgs())) {
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let outside = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 0 && Math.hypot(x + 0.5 - 216, y + 0.5 - 216) > 216 - layout.margin) outside++;
    }
    expect(outside, name).toBe(0);
  }
});

it('fits every minute in every font at Large, clear of date and battery', () => {
  for (const font of jarvisFonts) {
    const face = clockFace(font);
    for (let hour = 0; hour < 24; hour++) for (let minute = 0; minute < 60; minute++) {
      const text = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      expect(textWidth(face, text) * clockSizes.LARGE * clockScale).toBeLessThan(290);
    }
    const half = face.height * clockSizes.LARGE * clockScale / 2;
    expect(216 - half).toBeGreaterThan(layout.date.y + layout.date.height);
    expect(216 + half).toBeLessThan(layout.battery.y);
  }
});

it('preserves authored raster appearance after cropping and direct-transform packing', async () => {
  const compiled = await artwork();
  const sources = maskSvgs();
  for (const id of Object.keys(palettes) as (keyof typeof palettes)[]) {
    const p = palettes[id];
    const originalImages = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([name, svg]) =>
      [name, 'data:image/png;base64,' + (await sharp(Buffer.from(svg.replaceAll('white', p[masks[name].role]))).png().toBuffer()).toString('base64')])));
    for (const speed of ['STILL', 'SLOW', 'STANDARD', 'FAST'] as const) {
      const nodes = compiled.scenes[id][speed], images = await compiled.optimizer.previewImages(nodes, p);
      for (const ms of [0, 12345, 86399990]) {
        const f = at(ms);
        const raster = async (tree: Node[], masks: Record<string, string>) => sharp(Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect width="432" height="432" fill="black"/>${tree.map(n => nodeSvg(n, f, p, masks)).join('')}</svg>`)).removeAlpha().raw().toBuffer();
        const [a, b] = await Promise.all([raster(scene(speed), originalImages), raster(nodes, images)]);
        let error = 0, maximum = 0;
        for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); error += d; maximum = Math.max(maximum, d); }
        expect(error / a.length, `${id}/${speed}/${ms}`).toBeLessThan(0.1);
        expect(maximum).toBeLessThanOrEqual(4);
      }
    }
  }
}, 60000);

it('keeps the companion definition compact and passes its own packaged-scene profile', async () => {
  const xml = await compileWatchface();
  expect(Buffer.byteLength(xml)).toBeLessThan(250138); // Accepted NEXUS baseline.
  expect(xml.match(/<TimeText /g)?.length).toBe(60);
  const result = await exec('python3', ['-I', resolve(root, 'tools/check/verify_editor.py'), '--resources', resolve(root, 'faces/jarvis/src/main/res')]);
  expect(JSON.parse(result.stdout)).toMatchObject({ settings: 10, editorOptions: 30, maxRenderedParts: 18 });
});

it('reproduces committed resources without altering the accepted faces', async () => {
  await build(resolve(root, 'faces/jarvis/src/main/res'), true, 'jarvis');
}, 60000);
