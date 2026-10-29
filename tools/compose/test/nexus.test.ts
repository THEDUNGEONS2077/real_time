/**
 * NEXUS acceptance contracts: restart-free motion, bounded artwork and signals,
 * shared editor selection, readable layout, and deterministic packaged resources.
 * These tests cannot establish the watch renderer's delivered frame rate.
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { build, root } from '../src/build.ts';
import { value } from '../src/core/expr.ts';
import { frame } from '../src/core/frame.ts';
import type { Group, Node } from '../src/core/scene.ts';
import { selectNodes } from '../src/core/scene.ts';
import { clockFace, clockSizes } from '../src/fonts/catalog.ts';
import { textWidth } from '../src/fonts/glyphs.ts';
import { nodeXml } from '../src/wff/nodes.ts';
import { clockScale, effects, layout, masks, palettes, scene } from '../faces/nexus/design.ts';
import { nexusFonts } from '../faces/nexus/editor.ts';
import { maskSvgs } from '../faces/nexus/masks.ts';
import { compileWatchface } from '../faces/nexus/render.ts';

const exec = promisify(execFile);
const at = (ms: number) => frame({ time: new Date(Date.UTC(2026, 9, 28) + ms) });
const flat = (nodes: Node[]): Node[] => nodes.flatMap(n =>
  n.kind === 'group' ? [n, ...flat(n.children)] : n.kind === 'switch' ? flat(n.on) : [n]);
const groups = (nodes: Node[]) => flat(nodes).filter((n): n is Group => n.kind === 'group');
const circularDelta = (a: number, b: number) => (b - a + 540) % 360 - 180;

describe('NEXUS motion', () => {
  it('scales the decorative rings while preserving true seconds', () => {
    const expected = { outer_rotor: 7.5, code_orbit: -1.875, bezel_sweep: 10, seconds_mark: 6 };
    for (const [speed, factor] of [['SLOW', 1], ['STANDARD', 2], ['FAST', 4]] as const) {
      for (const n of groups(scene(speed))) {
        if (!(n.name in expected)) continue;
        const rate = circularDelta(value(n.angle!, at(12340)), value(n.angle!, at(12350))) / 0.01;
        expect(rate, `${speed}/${n.name}`).toBeCloseTo(expected[n.name as keyof typeof expected] * (n.name === 'seconds_mark' ? 1 : factor), 6);
      }
    }
  });

  it('keeps ring phase continuous at midnight and has no restartable animation loops', async () => {
    for (const speed of ['SLOW', 'STANDARD', 'FAST'] as const) {
      for (const n of groups(scene(speed))) {
        if (n.angle === undefined) continue;
        const delta = circularDelta(value(n.angle, at(86400000 - 10)), value(n.angle, at(86400000)));
        expect(Math.abs(delta), `${speed}/${n.name}`).toBeLessThan(0.41);
      }
    }
    expect(await compileWatchface()).not.toContain('<Animation');
  });

  it('keeps packets on their circuit runs and hides both ends of the wrap', () => {
    const packets = groups(scene('STANDARD')).filter(n => n.name.startsWith('packet_'));
    for (const n of packets) {
      const image = n.children[0];
      expect(image.kind).toBe('image');
      if (image.kind !== 'image') continue;
      for (let ms = 0; ms <= 16000; ms += 25) {
        const offset = value(n.y!, at(ms));
        const alpha = value(n.alpha!, at(ms));
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(76);
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(230);
        for (const x of [image.x!, image.x! + image.width!]) {
          for (const y of [image.y! + offset, image.y! + offset + image.height!]) {
            expect(Math.hypot(x - 216, y - 216)).toBeLessThan(216 - layout.margin);
          }
        }
        if (offset < 0.3 || offset > 75.7) expect(alpha).toBeLessThan(3);
      }
    }
  });

  it('removes clock expressions completely in Still or with every effect off', () => {
    const off = Object.fromEntries(effects.map(e => [e, 'FALSE']));
    for (const nodes of [scene('STILL'), selectNodes(scene(), off)]) {
      expect(nodes.map(n => nodeXml(n, palettes.FUSION)).join('')).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|<Animation/);
    }
  });
});

describe('NEXUS artwork and layout', () => {
  it('keeps all full-canvas masks, including baked glow, inside the circular safe margin', async () => {
    for (const [name, svg] of Object.entries(maskSvgs())) {
      if (name === 'nexus_packet') continue; // Its translated bounds are tested above.
      const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let outside = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 0 && Math.hypot(x + 0.5 - 216, y + 0.5 - 216) > 216 - layout.margin) outside++;
      }
      expect(outside, name).toBe(0);
    }
    expect(Object.keys(maskSvgs()).sort()).toEqual(Object.keys(masks).sort());
  });

  it('keeps every time and font inside the clock aperture even at Large', () => {
    for (const font of nexusFonts) {
      const face = clockFace(font);
      for (let hour = 0; hour < 24; hour++) for (let minute = 0; minute < 60; minute++) {
        const text = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        expect(textWidth(face, text) * clockSizes.LARGE * clockScale, `${font}/${text}`).toBeLessThan(310);
      }
      const halfHeight = face.height * clockSizes.LARGE * clockScale / 2;
      expect(216 - halfHeight).toBeGreaterThan(layout.date.y + layout.date.height);
      expect(216 + halfHeight).toBeLessThan(layout.battery.y);
    }
  });
});

describe('NEXUS release contracts', () => {
  it('passes the selected-tree editor and ambient checker', async () => {
    const result = await exec('python3', ['-I', resolve(root, 'tools/check/verify_editor.py'), '--resources', resolve(root, 'faces/nexus/src/main/res')]);
    expect(JSON.parse(result.stdout)).toMatchObject({ settings: 11, packaged: false });
  }, 30000);

  it('reproduces all committed resources byte for byte', async () => {
    await build(resolve(root, 'faces/nexus/src/main/res'), true, 'nexus');
  }, 60000);
});
