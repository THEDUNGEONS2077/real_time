/**
 * REDLINE contract tests: motion, layout, fonts, readouts, the Timer slot and reproducibility.
 * Watch behaviour (delivered smoothness, provider content, battery) is tested on the device.
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { build, root } from '../src/build.ts';
import { expression, readsSource, value } from '../src/core/expr.ts';
import { clockText, frame } from '../src/core/frame.ts';
import type { Frame } from '../src/core/frame.ts';
import { polar } from '../src/core/geometry.ts';
import type { Node } from '../src/core/scene.ts';
import { selectNodes } from '../src/core/scene.ts';
import { glyphOf, textWidth, widestClock } from '../src/fonts/glyphs.ts';
import { nodeXml } from '../src/wff/nodes.ts';
import { effects, layout, motion, palettes, scene, smoothFps, speeds } from '../faces/redline/design.ts';
import { ambientScale, clockCellHeight, clockFace, clockMaxWidth, clockSizes, fontIds, readoutChars, readoutFace } from '../faces/redline/fonts.ts';
import type { ClockSize } from '../faces/redline/fonts.ts';
import { previewSvg, readoutText } from '../faces/redline/preview.ts';
import { clockBox, compileWatchface, slot } from '../faces/redline/render.ts';

const xml = compileWatchface().xml;
const red = palettes.REFERENCE;
/** Config with every effect set to one value. */
const allEffects = (on: boolean) => Object.fromEntries(effects.map(e => [e, on ? 'TRUE' : 'FALSE']));
/** Selected nodes, flattened with their groups kept in the list. */
const flat = (nodes: Node[]): Node[] => nodes.flatMap(n => (n.kind === 'group' ? [n, ...flat(n.children)] : n.kind === 'switch' ? flat(n.on) : [n]));

/** Distances from the centre of every drawn point after all group transforms, including half the stroke. */
function radii(nodes: Node[], f: Frame, map: (x: number, y: number) => [number, number] = (x, y) => [x, y]): number[] {
  return selectNodes(nodes, f.config).flatMap(n => {
    if (n.kind === 'switch') return [];
    if (n.kind === 'group') {
      const a = value(n.angle ?? 0, f) * Math.PI / 180, dx = value(n.x ?? 0, f), dy = value(n.y ?? 0, f);
      return radii(n.children, f, (x, y) => {
        const u = x - 216, v = y - 216;
        return map(216 + dx + u * Math.cos(a) - v * Math.sin(a), 216 + dy + u * Math.sin(a) + v * Math.cos(a));
      });
    }
    if (n.kind === 'image' && n.resource === 'redline_mesh') return [];
    // This bounds helper checks REDLINE's authored geometry, before raster packing.
    if (n.kind === 'sprite') throw new Error('Use raster pixel bounds for a packed sprite.');
    const x = n.x ?? 0, y = n.y ?? 0;
    const points: [number, number][] = n.kind === 'line' ? [[x, y], [n.x2!, n.y2!]]
      : n.kind === 'rect' || n.kind === 'image' ? [[x, y], [x + n.width!, y], [x, y + n.height!], [x + n.width!, y + n.height!]]
        : n.kind === 'circle' ? Array.from({ length: 24 }, (_, i) => polar(n.r!, i * 15, x, y))
          : Array.from({ length: 73 }, (_, i) => polar(n.r!, n.start! + (n.end! - n.start!) * i / 72, n.cx ?? 216, n.cy ?? 216));
    const stroke = 'stroke' in n ? (n.stroke ?? 0) / 2 : 0;
    return points.map(([px, py]) => { const [a, b] = map(px, py); return Math.hypot(a - 216, b - 216) + stroke; });
  });
}

describe('motion', () => {
  it('keeps every glowing ring inside the round safe margin at full tilt', () => {
    for (const tiltX of [-3, 0, 3]) for (const tiltY of [-3, 3]) for (let s = 0; s < 60; s += 2.5) {
      const f = frame({ time: new Date(Date.UTC(2026, 9, 24, 23, 59, 0) + s * 1000), tiltX, tiltY });
      expect(Math.max(...radii(scene(), f))).toBeLessThanOrEqual(216 - layout.margin);
    }
  });

  it('turns the outer rotor clockwise and the two red bands counter-clockwise at different speeds', () => {
    // Degrees per second at Slow: outer 10, inner band 5, inset band 7.5 (before Dynamic's wobble).
    const expected: Record<string, number> = { outer_rotor: 10, inner_rotor: -5, inset_rotor: -7.5 };
    for (const style of ['SMOOTH', 'GLIDE', 'DYNAMIC'] as const) for (let s = 0; s < 120; s += 0.25) {
      const a = frame({ time: new Date(Date.UTC(2026, 9, 24) + s * 1000) }), b = frame({ time: new Date(a.time.getTime() + 10) });
      for (const n of flat(scene('SLOW', style))) if (n.kind === 'group' && n.name in expected) {
        const rate = ((value(n.angle!, b) - value(n.angle!, a) + 540) % 360 - 180) / 0.01;
        const target = expected[n.name];
        expect(Math.sign(rate), `${style} ${n.name}`).toBe(Math.sign(target));
        // Dynamic's wobble changes speed by at most about half.
        expect(Math.abs(rate - target), `${style} ${n.name}`).toBeLessThanOrEqual(style === 'DYNAMIC' ? Math.abs(target) * 0.6 : 1e-6);
      }
    }
    expect(motion.inner).not.toBe(motion.inset);
  });

  it('makes STILL and all-effects-off free of every clock and sensor source', () => {
    const output = (nodes: Node[]) => nodes.map(n => nodeXml(n, red)).join('');
    expect(output(scene('STILL'))).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|ACCELEROMETER|Animation/);
    const off = selectNodes(scene(), allEffects(false));
    expect(output(off)).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|ACCELEROMETER|seconds_beacon|radar_sweep/);
    for (const n of flat(off)) if (n.kind === 'group') expect(readsSource(n.angle) || readsSource(n.alpha)).toBe(false);
  });

  it('gives every effect its own moving transform', () => {
    for (const effect of effects) {
      const config = { ...allEffects(false), [effect]: 'TRUE' };
      expect(selectNodes(scene(), config).map(n => nodeXml(n, red)).join(''), effect).toMatch(/Transform|Gyro/);
    }
  });

  it('starts SMOOTH and DYNAMIC instantly from the live clock; GLIDE refreshes non-repeating transitions', () => {
    for (const style of ['SMOOTH', 'DYNAMIC'] as const) {
      const output = scene('SLOW', style).map(n => nodeXml(n, red)).join('');
      expect(output, style).not.toContain('<Animation');
      expect(output, style).toContain('[MILLISECOND]');
    }
    const glide = scene('SLOW', 'GLIDE').map(n => nodeXml(n, red)).join('');
    expect(glide).toContain('fps="60" repeat="0"');
    expect(glide).not.toContain('MILLISECOND');
    expect(glide).not.toContain('repeat="-1"');
    expect(glide).toContain('angleDirection="COUNTER_CLOCKWISE"');
  });

  it('interpolates in sub-pixel steps without reversing at the wrap, including midnight and re-entry gaps', () => {
    expect(smoothFps).toBe(60);
    for (const sample of ['2026-10-25T00:00:00.500Z', '2026-10-25T23:59:59.983Z', '2026-10-25T10:45:17.500Z']) {
      const f = frame({ time: new Date(sample) }), previous = frame({ time: new Date(f.time.getTime() - 1000) });
      for (const n of flat(scene('SLOW', 'GLIDE'))) if (n.kind === 'group' && n.angleTransition) {
        const a = value(n.angleTransition.value, previous), b = value(n.angleTransition.value, f);
        const direction = n.angleTransition.direction === 'CLOCKWISE' ? 1 : -1;
        const delta = direction * ((direction * (b - a) % 360 + 360) % 360);
        const interpolated = a + delta * f.time.getUTCMilliseconds() / 1000;
        expect(((interpolated - value(n.angle!, f) + 540) % 360) - 180).toBeCloseTo(0, 7);
        expect(Math.abs(delta) / smoothFps).toBeLessThanOrEqual(0.25);
        expect(expression(n.angleTransition.value)).toContain('[SECONDS_IN_DAY]');
      }
    }
  });
});

describe('fonts', () => {
  it('fits every font in the accepted clock width with one shared cell height', () => {
    for (const id of fontIds) {
      const face = clockFace(id);
      expect(face.height, id).toBe(clockCellHeight);
      expect(widestClock(face), id).toBeLessThanOrEqual(clockMaxWidth);
      for (const c of '0123456789:') expect(glyphOf(face, c).width, `${id} ${c}`).toBeGreaterThan(0);
    }
    // REDLINE keeps 0.3.2's proportional advances.
    const redline = clockFace('REDLINE');
    expect(['0', '1', '3', '7', '8'].map(c => glyphOf(redline, c).width)).toEqual([74, 16, 64, 64, 74]);
  });

  it('keeps the widest clock of every size inside its box and the readable opening', () => {
    for (const size of Object.keys(clockSizes) as ClockSize[]) {
      const scale = clockSizes[size], box = clockBox(scale);
      expect(box.x * 2 + box.width).toBe(432);
      expect(box.y * 2 + box.height).toBe(432);
      for (const id of fontIds) expect(widestClock(clockFace(id)) * scale).toBeLessThanOrEqual(box.width);
      // The clock clears the date above and the complication below.
      expect(box.y).toBeGreaterThanOrEqual(layout.date.y + layout.date.height);
      expect(box.y + box.height).toBeLessThanOrEqual(layout.complication.y);
    }
  });

  it('centres visible ink on (216,216) for narrow and wide times in every font', async () => {
    for (const id of fontIds) for (const time of ['11:11', '08:08', '10:45']) {
      // Render only the clock: ambient frames draw nothing else.
      const svg = previewSvg(frame({ ambient: true, time: new Date(`2026-10-25T${time}:00Z`), config: { clock_font: id } }));
      const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let left = 432, right = 0, top = 432, bottom = 0;
      for (let y = 0; y < 432; y++) for (let x = 0; x < 432; x++) {
        const p = (y * 432 + x) * info.channels;
        if (data[p] + data[p + 1] + data[p + 2] > 24) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      // LCD digits keep fixed cells like a real display: a 1 lights its right-hand segments, so
      // 11:11 sits up to one segment width right of centre (the unlit ghost cells are centred).
      const tolerance = id === 'SEGMENT' ? 20 : 2;
      expect(Math.abs((left + right + 1) / 2 - 216), `${id} ${time} x`).toBeLessThanOrEqual(tolerance);
      expect(Math.abs((top + bottom + 1) / 2 - 216), `${id} ${time} y`).toBeLessThanOrEqual(2);
    }
  }, 60000);

  it('lays out text from the same cells the watch receives', () => {
    const face = clockFace('RAJDHANI');
    const text = clockText(new Date('2026-10-25T08:08:00Z'), true);
    expect(textWidth(face, text)).toBe([...text].reduce((sum, c) => sum + glyphOf(face, c).width, 0));
    expect(xml).toContain(`<Character name="8" resource="clock_rajdhani_low_8" width="${glyphOf(face, '8').width}" height="118">`);
    expect(xml).toContain(`size="${Number((clockCellHeight * ambientScale).toFixed(2))}"`);
  });
});

describe('readouts', () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  it('covers every English weekday, month, digit and percent in each readout face', () => {
    for (const id of fontIds) {
      const face = readoutFace(id);
      if (!face) { expect(id).toBe('REDLINE'); continue; }
      for (const word of [...days, ...months, '0123456789', '%', '_']) for (const c of word) expect(() => glyphOf(face, c), `${id} ${c}`).not.toThrow();
      for (const c of readoutChars) expect(face.glyphs.has(c)).toBe(true);
    }
  });

  it('formats date rollover and battery like the watch templates', () => {
    expect(readoutText(frame({ time: new Date('2026-10-25T00:00:00Z') })).date.join(' ')).toBe('SUN 25 OCT');
    expect(readoutText(frame({ battery: 7 })).battery).toBe('7%');
    expect(xml).toContain('%s_%02d_%s');
    expect(xml).toContain('[DAY_OF_WEEK_S]');
  });

  it('turns only the battery readout to the warning colour at 15% or less', () => {
    expect(xml).toContain('[BATTERY_PERCENT] <= 15');
    expect(previewSvg(frame({ battery: 15 }))).toContain(red.warning);
    expect(previewSvg(frame({ battery: 16 }))).not.toContain(red.warning);
  });

  it('stacks battery, date, clock and complication without overlap inside the inner ring', () => {
    const boxes = [layout.battery, layout.date, clockBox(clockSizes.MEDIUM), layout.complication];
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height);
    for (const b of [layout.battery, layout.complication]) {
      for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
        expect(Math.hypot(x - 216, y - 216)).toBeLessThanOrEqual(layout.innerRadius);
      }
    }
  });
});

describe('watch face', () => {
  it('declares a Timer slot for every provider type, empty by default and hidden in ambient', () => {
    expect(xml).toContain('supportedTypes="SHORT_TEXT RANGED_VALUE MONOCHROMATIC_IMAGE SMALL_IMAGE EMPTY"');
    expect(xml).toContain('defaultSystemProvider="EMPTY"');
    expect(xml).toContain(slot.emptyText);
    const ambient = xml.slice(xml.indexOf('name="ambient"'), xml.indexOf('<ComplicationSlot'));
    expect(ambient).not.toMatch(/Transform|Gyro|MILLISECOND|redline_mesh|PartText|PartImage/);
  });

  it('uses literal colours only: no theme lookup that turned 0.1.0 white', () => {
    expect(xml).not.toMatch(/CONFIGURATION\.palette\.\d/);
    expect(xml).not.toContain('ColorConfiguration');
    expect(xml).toContain('backgroundColor="#000000"');
    for (const p of Object.values(palettes)) expect(previewSvg(frame({ config: { palette: Object.keys(palettes).find(k => palettes[k as keyof typeof palettes] === p)! } }))).toContain(p.accent);
  });

  it('contains no frame sequences, runtime blur or launch shortcuts', () => {
    expect(xml).not.toMatch(/SequenceImages|AnimatedImage|GaussianBlur|Launch/);
  });

  it('reproduces all committed REDLINE resources byte for byte', async () => {
    await build(resolve(root, 'faces/redline/src/main/res'), true, 'redline');
  }, 60000);
});
