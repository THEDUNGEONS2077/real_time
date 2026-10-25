/**
 * CIPHER contract tests: instant live-clock motion, ring speeds, rain wrap, mask bounds,
 * readouts, the Timer slot and reproducibility. Smoothness on the watch is judged by the user.
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { build, root } from '../src/build.ts';
import { readsSource, value } from '../src/core/expr.ts';
import { frame } from '../src/core/frame.ts';
import type { Node } from '../src/core/scene.ts';
import { selectNodes } from '../src/core/scene.ts';
import { readoutFace } from '../src/fonts/catalog.ts';
import { glyphOf } from '../src/fonts/glyphs.ts';
import { nodeXml } from '../src/wff/nodes.ts';
import { rainHeight } from '../faces/cipher/assets.ts';
import { effects, layout, masks, palettes, rain, scene } from '../faces/cipher/design.ts';
import { cipherFonts } from '../faces/cipher/editor.ts';
import { maskSvgs } from '../faces/cipher/masks.ts';
import { previewSvg } from '../faces/cipher/preview.ts';
import { compileWatchface } from '../faces/cipher/render.ts';

const exec = promisify(execFile);
const xml = compileWatchface();
const green = palettes.PHOSPHOR;
const flat = (nodes: Node[]): Node[] => nodes.flatMap(n => (n.kind === 'group' ? [n, ...flat(n.children)] : n.kind === 'switch' ? flat(n.on) : [n]));
const allEffects = (on: boolean) => Object.fromEntries(effects.map(e => [e, on ? 'TRUE' : 'FALSE']));

describe('motion', () => {
  it('starts instantly: every moving part reads the live clock and nothing animates', () => {
    const output = scene('SLOW').map(n => nodeXml(n, green)).join('');
    expect(output).not.toContain('<Animation');
    expect(output).toContain('[MILLISECOND]');
    expect(xml).not.toContain('<Animation');
  });

  it('turns the rings at their own speeds and directions, scaled by speed', () => {
    // Degrees per second at Slow; negative is counter-clockwise.
    const expected: Record<string, number> = { outer_code: 3, inner_code: 4, arc_ring: -6, comet_sweep: 18 };
    for (const [speed, factor] of [['SLOW', 1], ['STANDARD', 2], ['FAST', 4]] as const) {
      const a = frame({ time: new Date('2026-10-25T10:45:00.250Z') }), b = frame({ time: new Date(a.time.getTime() + 10) });
      for (const n of flat(scene(speed))) if (n.kind === 'group' && n.name in expected) {
        const rate = ((value(n.angle!, b) - value(n.angle!, a) + 540) % 360 - 180) / 0.01;
        expect(rate, `${speed} ${n.name}`).toBeCloseTo(expected[n.name] * factor, 6);
      }
    }
  });

  it('drops each rain column from above the screen to below it, then wraps', () => {
    for (const [i, column] of rain.entries()) {
      const ys: number[] = [];
      for (let t = 0; t < column.period * 2; t += 0.05) {
        const f = frame({ time: new Date(Date.UTC(2026, 9, 25, 10, 45) + t * 1000) });
        const group = flat(scene('SLOW')).find(n => n.kind === 'group' && n.name === `rain_${i}`)!;
        if (group.kind === 'group') ys.push(value(group.y!, f));
      }
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(-rainHeight);
      expect(Math.max(...ys)).toBeLessThanOrEqual(432);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(400);
    }
  });

  it('removes every live source in STILL and with all effects off', () => {
    for (const nodes of [scene('STILL'), selectNodes(scene('SLOW'), allEffects(false))]) {
      const output = nodes.map(n => nodeXml(n, green)).join('');
      expect(output).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|SECOND_MILLISECOND/);
      for (const n of flat(nodes)) if (n.kind === 'group') expect(readsSource(n.angle) || readsSource(n.y)).toBe(false);
    }
  });
});

describe('artwork', () => {
  it('keeps every ring mask inside the round safe margin and empty at the centre', async () => {
    for (const [name, svg] of Object.entries(maskSvgs())) {
      if (name.startsWith('cipher_rain_')) continue;
      const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let outside = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 8 && Math.hypot(x + 0.5 - 216, y + 0.5 - 216) > 216 - layout.margin) outside++;
      }
      expect(outside, name).toBe(0);
    }
  });

  it('declares a tint role for every mask and uses only literal colours', () => {
    expect(Object.keys(maskSvgs()).sort()).toEqual(Object.keys(masks).sort());
    expect(xml).not.toMatch(/CONFIGURATION\.palette\.\d|ColorConfiguration/);
    for (const p of Object.values(palettes)) expect(xml).toContain(p.accent);
  });
});

describe('readouts and slot', () => {
  it('covers every English weekday, month, digit and percent in each readout face', () => {
    const words = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', '0123456789%_'];
    for (const font of cipherFonts) for (const word of words) for (const c of word) expect(() => glyphOf(readoutFace(font)!, c), `${font} ${c}`).not.toThrow();
  });

  it('turns the battery readout to the warning colour at 15% or less', () => {
    // Readout glyphs are embedded as base64 SVG images, so decode them before looking for the colour.
    const decoded = (svg: string) => [...svg.matchAll(/base64,([A-Za-z0-9+/=]+)/g)].map(m => Buffer.from(m[1], 'base64').toString()).join('');
    expect(decoded(previewSvg(frame({ battery: 15 })))).toContain(green.warning);
    expect(decoded(previewSvg(frame({ battery: 16 })))).not.toContain(green.warning);
    expect(xml).toContain(`color="${green.warning}"`);
  });

  it('declares one empty-by-default Timer slot for every provider type', () => {
    expect(xml.match(/<ComplicationSlot /g)).toHaveLength(1);
    expect(xml).toContain('supportedTypes="SHORT_TEXT RANGED_VALUE MONOCHROMATIC_IMAGE SMALL_IMAGE EMPTY"');
    expect(xml).toContain('defaultSystemProvider="EMPTY"');
  });
});

describe('watch face', () => {
  it('passes the release checker', async () => {
    const result = await exec('python3', ['-I', resolve(root, 'tools/check/verify_editor.py'), '--resources', resolve(root, 'faces/cipher/src/main/res')]);
    expect(JSON.parse(result.stdout)).toMatchObject({ settings: 10, packaged: false });
  }, 30000);

  it('reproduces all committed CIPHER resources byte for byte', async () => {
    await build(resolve(root, 'faces/cipher/src/main/res'), true, 'cipher');
  }, 60000);
});
