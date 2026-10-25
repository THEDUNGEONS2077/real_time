/**
 * CIPHER WFF layer: compile the face into watchface.xml.
 *
 * Scene structure (only one branch of each Condition is active):
 *
 *   interactive group (hidden in ambient)
 *     ground
 *     palette ▸ { decoration (each effect ▸ speed), clock font ▸ glow ▸ size ▸ DigitalClock, clock font ▸ readouts }
 *   ambient group (shown in ambient)
 *     palette ▸ clock font ▸ dim static DigitalClock
 *   Timer complication slot (hidden in ambient)
 *
 * Readouts are tinted with the palette's bright text colour, so they sit inside the
 * palette branch. Colours are always literals (a theme lookup turned REDLINE 0.1.0 white).
 */
import { stillNodes } from '../../src/core/scene.ts';
import { configurationXml, editorStrings, selectXml } from '../../src/editor/catalogue.ts';
import { clockCellHeight, clockFace, clockMaxWidth, clockSizes, readoutFace, glows } from '../../src/fonts/catalog.ts';
import type { ClockSize, FontId, GlowId } from '../../src/fonts/catalog.ts';
import { bitmapFontXml } from '../../src/fonts/wff.ts';
import { slotXml } from '../../src/wff/complication.ts';
import type { SlotSpec } from '../../src/wff/complication.ts';
import { nodeXml } from '../../src/wff/nodes.ts';
import { breakLines, canvas, condition, escapeXml, lowBattery, tag } from '../../src/wff/xml.ts';
import { layout, palettes, scene, speeds } from './design.ts';
import type { PaletteId, Speed } from './design.ts';
import { cipherFonts, editorSettings, settingById } from './editor.ts';

/** The ambient clock is a compact, crisp, dim copy of the chosen font. */
export const ambientScale = 94 / 118;
export const ambientAlpha = 110;

/** The Timer slot. Neutral colours, so it reads on every palette. */
export const slot: SlotSpec = {
  id: 0, name: 'timer_slot', ...layout.complication,
  ink: '#d6dde0', dim: '#7d868c', emptyText: 'SET TIMER', fontFamily: 'monospace',
};

/** BitmapFont family names; also the glyph resource prefixes. */
export const clockFamily = (font: FontId, glow: GlowId) => `clock_${font.toLowerCase()}_${glow.toLowerCase()}`;
export const readoutFamily = (font: FontId) => `readout_${font.toLowerCase()}`;

/** Clock box for a scale: centred on (216,216), integer, wide enough for the widest time. */
export function clockBox(scale: number) {
  const even = (n: number) => 2 * Math.ceil(n / 2);
  const width = even((clockMaxWidth + 40) * scale), height = even(clockCellHeight * scale);
  return { x: 216 - width / 2, y: 216 - height / 2, width, height };
}

/** One native clock following the watch's 12/24-hour setting. */
function clockXml(family: string, scale: number, colour: string, alpha = 255): string {
  return tag('DigitalClock', canvas, tag('TimeText', { ...clockBox(scale), format: 'hh:mm', hourFormat: 'SYNC_TO_DEVICE', align: 'CENTER', alpha },
    tag('BitmapFont', { family, size: Number((clockCellHeight * scale).toFixed(2)), color: colour })));
}

/** Date template: weekday, day and month separated by the '_' gap glyph. */
const dateTemplate = tag('Template', {}, '%s_%02d_%s' + ['[DAY_OF_WEEK_S]', '[DAY]', '[MONTH_S]'].map(expression => tag('Parameter', { expression })).join(''));
const batteryTemplate = tag('Template', {}, '%d%%' + tag('Parameter', { expression: '[BATTERY_PERCENT]' }));

/** Battery and date in one font's readout face; battery turns to the warning colour at 15% or less. */
function readoutsXml(font: FontId, ink: string, warning: string): string {
  const face = readoutFace(font)!;
  const text = (box: { x: number; y: number; width: number; height: number }, content: string, colour: string) =>
    tag('PartText', box, tag('Text', { align: 'CENTER' }, tag('BitmapFont', { family: readoutFamily(font), size: face.height, color: colour }, content)));
  return condition([{ when: lowBattery, then: text(layout.battery, batteryTemplate, warning) }], text(layout.battery, batteryTemplate, ink))
    + text(layout.date, dateTemplate, ink);
}

/** Everything that depends on the palette: decoration, clock and readouts. */
function paletteXml(id: PaletteId): string {
  const p = palettes[id];
  const [speedSetting, fontSetting, glowSetting, sizeSetting] = ['motion_speed', 'clock_font', 'glow', 'clock_size'].map(settingById);
  // Every speed's scene has the same top-level shape, so index i is the same node in all of them.
  const base = scene('STANDARD');
  const decoration = base.map((node, index) => {
    if (node.kind !== 'switch') return nodeXml(node, p);
    return selectXml(speedSetting, Object.fromEntries((Object.keys(speeds) as Speed[]).map(speed => {
      const chosen = speed === 'STILL' ? stillNodes([node]) : [scene(speed)[index]];
      return [speed, tag('Group', { ...canvas, name: `${id}_${index}_${speed}` }, chosen.map(n => nodeXml(n, p)).join(''))];
    })));
  }).join('');
  const clocks = selectXml(fontSetting, Object.fromEntries(cipherFonts.map(font => [font,
    selectXml(glowSetting, Object.fromEntries(glows.map(glow => [glow,
      selectXml(sizeSetting, Object.fromEntries((Object.keys(clockSizes) as ClockSize[]).map(size => [size,
        clockXml(clockFamily(font, glow), clockSizes[size], p.ink)])))])))])));
  const readouts = selectXml(fontSetting, Object.fromEntries(cipherFonts.map(font => [font, readoutsXml(font, p.ink, p.warning)])));
  return tag('Group', { ...canvas, name: `palette_${id}` }, decoration + clocks + readouts);
}

/** Every BitmapFont CIPHER uses: three glow levels plus a readout face per font. */
function bitmapFontsXml(): string {
  return cipherFonts.flatMap(font => [...glows.map(glow => bitmapFontXml(clockFamily(font, glow), clockFace(font))), bitmapFontXml(readoutFamily(font), readoutFace(font)!)]).join('');
}

/** Build watchface.xml. Pure: the same inputs always give the same bytes. */
export function compileWatchface(): string {
  const paletteSetting = settingById('palette'), fontSetting = settingById('clock_font');
  const ids = Object.keys(palettes) as PaletteId[];
  const ground = nodeXml({ kind: 'rect', ...canvas, role: 'ground' }, palettes.PHOSPHOR);
  const interactive = tag('Group', { ...canvas, name: 'interactive' },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }) + ground + selectXml(paletteSetting, Object.fromEntries(ids.map(id => [id, paletteXml(id)]))));
  const ambient = tag('Group', { ...canvas, name: 'ambient', alpha: 0 },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 255 }) +
    selectXml(paletteSetting, Object.fromEntries(ids.map(id => [id,
      selectXml(fontSetting, Object.fromEntries(cipherFonts.map(font => [font, clockXml(clockFamily(font, 'OFF'), ambientScale, palettes[id].line, ambientAlpha)])))]))));
  const face = tag('WatchFace', { width: 432, height: 432 },
    tag('Metadata', { key: 'PREVIEW_TIME', value: '10:45:00' }) +
    tag('BitmapFonts', {}, bitmapFontsXml()) +
    tag('UserConfigurations', {}, configurationXml(editorSettings)) +
    tag('Scene', { backgroundColor: '#000000' }, interactive + ambient + slotXml(slot)));
  return '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose/faces/cipher; edit the design, then run npm run compose. -->\n' + breakLines(face) + '\n';
}

/** Android string resources: face name, editor labels and the slot's label. */
export function stringsXml(): string {
  const strings: Record<string, string> = { face_name: 'CIPHER', ...editorStrings(editorSettings), [slot.name]: 'TIMER / SHORTCUT' };
  return '<?xml version="1.0" encoding="utf-8"?>\n' + tag('resources', {}, Object.entries(strings).map(([name, s]) => tag('string', { name }, escapeXml(s))).join('')) + '\n';
}
