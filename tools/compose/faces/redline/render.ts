/**
 * REDLINE WFF layer: compile the face into watchface.xml.
 *
 * Scene structure (only one branch of each Condition is active):
 *
 *   interactive group (hidden in ambient)
 *     ground
 *     palette ▸ decorative scene; each effect ▸ speed ▸ style
 *     clock font ▸ glow ▸ size ▸ DigitalClock
 *     clock font ▸ battery + date
 *   ambient group (shown in ambient)
 *     clock font ▸ dim static DigitalClock
 *   Timer complication slot (hidden in ambient)
 *
 * Clock, readouts and slot sit outside every moving group, so ring motion never
 * re-draws text. Their colours are palette-independent (neutral ink), so they are
 * declared once instead of once per palette.
 */
import { LayerCache } from '../../src/bake.ts';
import type { Node } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';
import { configurationXml, editorStrings, selectXml } from '../../src/editor/catalogue.ts';
import type { GlyphFace } from '../../src/fonts/glyphs.ts';
import { glyphResource } from '../../src/fonts/glyphs.ts';
import { bitmapFontXml } from '../../src/fonts/wff.ts';
import { slotXml } from '../../src/wff/complication.ts';
import type { SlotSpec } from '../../src/wff/complication.ts';
import { nodeXml } from '../../src/wff/nodes.ts';
import { breakLines, canvas, condition, escapeXml, lowBattery, tag } from '../../src/wff/xml.ts';
import { maskImages } from './assets.ts';
import { layout, palettes, scene, speeds } from './design.ts';
import type { MotionStyle, PaletteId, Speed } from './design.ts';
import { settingById, editorSettings } from './editor.ts';
import { ambientScale, clockCellHeight, clockFace, clockMaxWidth, clockSizes, fontIds, glows, readoutFace } from './fonts.ts';
import type { ClockSize, FontId, GlowId } from './fonts.ts';

/** Neutral readout colours, identical in every palette. */
export const ink = palettes.REFERENCE.ink;
export const warning = palettes.REFERENCE.warning;
/** The ambient clock is dim grey at low alpha: under 10% of the screen lights up. */
export const ambientInk = '#98a0a4';
export const ambientAlpha = 65;

/** The Timer complication slot. */
export const slot: SlotSpec = {
  id: 0, name: 'timer_slot', ...layout.complication,
  ink, dim: '#87909a', emptyText: 'SET TIMER', fontFamily: 'monospace',
};

/* ------------------------------------------------------------ bitmap fonts */

/** BitmapFont family name and glyph resource prefix for a clock font at one glow level. */
export const clockFamily = (font: FontId, glow: GlowId) => `clock_${font.toLowerCase()}_${glow.toLowerCase()}`;
/** BitmapFont family name and glyph resource prefix for a readout font. */
export const readoutFamily = (font: FontId) => `readout_${font.toLowerCase()}`;

/** Every BitmapFont the face declares. */
function bitmapFontsXml(): string {
  return fontIds.flatMap(font => {
    const clocks = glows.map(glow => bitmapFontXml(clockFamily(font, glow), clockFace(font)));
    const readout = readoutFace(font);
    return readout ? [...clocks, bitmapFontXml(readoutFamily(font), readout)] : clocks;
  }).join('');
}

/* ------------------------------------------------------------------- clock */

/** Clock box for a scale: centred on (216,216), wide enough for the widest time. */
export function clockBox(scale: number) {
  // WFF requires integer boxes. An even width and height keep the centre exactly on (216,216).
  const even = (n: number) => 2 * Math.ceil(n / 2);
  const width = even((clockMaxWidth + 40) * scale), height = even(clockCellHeight * scale);
  return { x: 216 - width / 2, y: 216 - height / 2, width, height };
}

/** One native clock. TimeText follows the watch's 12/24-hour setting and centres its own text. */
function clockXml(family: string, scale: number, colour: string, alpha = 255): string {
  const box = clockBox(scale);
  return tag('DigitalClock', canvas, tag('TimeText', { ...box, format: 'hh:mm', hourFormat: 'SYNC_TO_DEVICE', align: 'CENTER', alpha },
    tag('BitmapFont', { family, size: Number((clockCellHeight * scale).toFixed(2)), color: colour })));
}

/** Interactive clock: font ▸ glow ▸ size. */
function interactiveClockXml(): string {
  const [fontSetting, glowSetting, sizeSetting] = ['clock_font', 'glow', 'clock_size'].map(settingById);
  return selectXml(fontSetting, Object.fromEntries(fontIds.map(font => [font,
    selectXml(glowSetting, Object.fromEntries(glows.map(glow => [glow,
      selectXml(sizeSetting, Object.fromEntries((Object.keys(clockSizes) as ClockSize[]).map(size => [size,
        clockXml(clockFamily(font, glow), clockSizes[size], ink)])))])))])));
}

/** Ambient clock: one compact, crisp, dim size per font. */
function ambientClockXml(): string {
  return selectXml(settingById('clock_font'), Object.fromEntries(fontIds.map(font =>
    [font, clockXml(clockFamily(font, 'OFF'), ambientScale, ambientInk, ambientAlpha)])));
}

/* ---------------------------------------------------------------- readouts */

/** Date template: weekday, day and month separated by the '_' gap glyph (system fonts get spaces). */
const dateTemplate = (gap: string) => tag('Template', {}, `%s${gap}%02d${gap}%s`
  + ['[DAY_OF_WEEK_S]', '[DAY]', '[MONTH_S]'].map(expression => tag('Parameter', { expression })).join(''));
const batteryTemplate = tag('Template', {}, '%d%%' + tag('Parameter', { expression: '[BATTERY_PERCENT]' }));

/** One centred readout, switching to the warning colour at low battery when asked. */
function readoutXml(box: { x: number; y: number; width: number; height: number }, font: (colour: string) => string, warns: boolean): string {
  const text = (colour: string) => tag('PartText', box, tag('Text', { align: 'CENTER' }, font(colour)));
  return warns ? condition([{ when: lowBattery, then: text(warning) }], text(ink)) : text(ink);
}

/** Battery above, date below, in the selected font's readout face. */
function readoutsXml(): string {
  return selectXml(settingById('clock_font'), Object.fromEntries(fontIds.map(font => {
    const face = readoutFace(font);
    if (!face) {
      // REDLINE keeps 0.3.2's system monospace readouts, uppercased by WFF.
      const system = (size: number, content: string) => (colour: string) => tag('Font', { family: 'monospace', size, color: colour }, content);
      return [font, readoutXml(layout.battery, system(20, batteryTemplate), true) + readoutXml(layout.date, system(21, tag('Upper', {}, dateTemplate(' '))), false)];
    }
    const bitmap = (content: string) => (colour: string) => tag('BitmapFont', { family: readoutFamily(font), size: face.height, color: colour }, content);
    return [font, readoutXml(layout.battery, bitmap(batteryTemplate), true) + readoutXml(layout.date, bitmap(dateTemplate('_')), false)];
  })));
}

/* ------------------------------------------------------------- decoration */

/** Decorative scene for one palette, with each effect switch expanded into speed ▸ style branches. */
function paletteXml(id: PaletteId, cache: LayerCache): string {
  const palette = palettes[id];
  const [speedSetting, styleSetting] = ['motion_speed', 'motion_style'].map(settingById);
  // Each speed/style scene has the same top-level shape, so index i is the same node in all of them.
  const variants = new Map<string, Node[]>();
  const variant = (speed: Speed, style: MotionStyle) => {
    const key = `${speed}_${style}`;
    if (!variants.has(key)) variants.set(key, cache.scene(scene(speed, style)));
    return variants.get(key)!;
  };
  const base = variant('STANDARD', 'SMOOTH');
  const body = base.map((node, index) => {
    if (node.kind !== 'switch') return nodeXml(node, palette);
    const branch = (speed: Speed, style: MotionStyle) => {
      const chosen = speed === 'STILL' ? stillNodes([node]) : [variant(speed, style)[index]];
      return tag('Group', { ...canvas, name: `${id}_${index}_${speed}_${style}` }, chosen.map(n => nodeXml(n, palette)).join(''));
    };
    const styles = styleSetting.options.map(o => o.id as MotionStyle);
    return selectXml(speedSetting, Object.fromEntries((Object.keys(speeds) as Speed[]).map(speed => [speed,
      speed === 'STILL' ? branch('STILL', 'SMOOTH') : selectXml(styleSetting, Object.fromEntries(styles.map(style => [style, branch(speed, style)])))])));
  }).join('');
  return tag('Group', { ...canvas, name: `palette_${id}` }, body);
}

/* ---------------------------------------------------------------- document */

/** The compiled face plus the layer caches whose images must be packaged. */
export interface Compiled { xml: string; caches: LayerCache[] }

/** Build watchface.xml. Pure: the same inputs always give the same bytes. */
export function compileWatchface(): Compiled {
  const caches: LayerCache[] = [];
  const decoration = selectXml(settingById('palette'), Object.fromEntries((Object.keys(palettes) as PaletteId[]).map(id => {
    const cache = new LayerCache(palettes[id], maskImages(palettes[id]));
    caches.push(cache);
    return [id, paletteXml(id, cache)];
  })));
  const ground = nodeXml({ kind: 'rect', ...canvas, role: 'ground' }, palettes.REFERENCE);
  const interactive = tag('Group', { ...canvas, name: 'interactive' },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }) + ground + decoration + interactiveClockXml() + readoutsXml());
  const ambient = tag('Group', { ...canvas, name: 'ambient', alpha: 0 },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 255 }) + ambientClockXml());
  const face = tag('WatchFace', { width: 432, height: 432 },
    tag('Metadata', { key: 'PREVIEW_TIME', value: '10:45:00' }) +
    tag('BitmapFonts', {}, bitmapFontsXml()) +
    tag('UserConfigurations', {}, configurationXml(editorSettings)) +
    tag('Scene', { backgroundColor: '#000000' }, interactive + ambient + slotXml(slot)));
  const xml = '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose/faces/redline; edit the design, then run npm run compose. -->\n' + breakLines(face) + '\n';
  return { xml, caches };
}

/** Android string resources: face name, editor labels and the slot's label. */
export function stringsXml(): string {
  const strings: Record<string, string> = { face_name: 'REDLINE', ...editorStrings(editorSettings), [slot.name]: 'TIMER / SHORTCUT' };
  const body = Object.entries(strings).map(([name, s]) => tag('string', { name }, escapeXml(s))).join('');
  return '<?xml version="1.0" encoding="utf-8"?>\n' + tag('resources', {}, body) + '\n';
}
