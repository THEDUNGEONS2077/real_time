/**
 * NEXUS WFF layer: compile the face into watchface.xml.
 *
 * Scene structure (only one branch of each Condition is active):
 *
 *   interactive group (hidden in ambient)
 *     (opaque black comes from Scene.backgroundColor)
 *     palette ▸ decoration (each effect ▸ speed)
 *     clock tint ▸ clock font ▸ glow ▸ size ▸ DigitalClock
 *     clock font ▸ readouts (configuration-only colour transforms)
 *   ambient group (shown in ambient)
 *     palette ▸ clock font ▸ dim static DigitalClock
 *   Timer complication slot (hidden in ambient)
 *
 * Share interactive text across palettes to limit the companion editor's scene.
 * WFF 4 colour transforms select explicit RGB constants, never indexed theme colours.
 * Ambient keeps its literal-colour clocks and has no transforms.
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
import { clockScale, layout, palettes, speeds } from './design.ts';
import type { PaletteId, Speed } from './design.ts';
import { nexusFonts, editorSettings, settingById } from './editor.ts';
import { artwork } from './artwork.ts';
import type { NexusArtwork } from './artwork.ts';

/** The ambient clock is a compact, crisp, dim copy of the chosen font. */
export const ambientScale = 94 / 118;
/** Additional alpha dimming applied to the quiet palette colour in ambient. */
export const ambientAlpha = 110;

/** The Timer slot. Neutral colours, so it reads on every palette. */
export const slot: SlotSpec = {
  id: 0, name: 'timer_slot', ...layout.complication,
  ink: '#d6dde0', dim: '#7d868c', emptyText: 'SET TIMER', fontFamily: 'monospace',
};

/** BitmapFont family names; also the glyph resource prefixes. */
export const clockFamily = (font: FontId, glow: GlowId) => `clock_${font.toLowerCase()}_${glow.toLowerCase()}`;
/** Date and battery reuse one small glyph family per chosen font. */
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

/** WFF 4 typed colours from the design palette; only editor changes invalidate them. */
function paletteColour(role: 'ink' | 'warning'): string {
  const setting = settingById('palette');
  const rgb = (id: string) => {
    const hex = palettes[id as PaletteId][role];
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `colorRgb(${channels.join(',')})`;
  };
  return setting.options.filter(option => option.id !== setting.defaultValue).reduceRight(
    (fallback, option) => `([CONFIGURATION.palette] == "${option.id}" ? ${rgb(option.id)} : ${fallback})`,
    rgb(setting.defaultValue),
  );
}

/** Date template: weekday, day and month separated by the '_' gap glyph. */
const dateTemplate = tag('Template', {}, '%s_%02d_%s' + ['[DAY_OF_WEEK_S]', '[DAY]', '[MONTH_S]'].map(expression => tag('Parameter', { expression })).join(''));
const batteryTemplate = tag('Template', {}, '%d%%' + tag('Parameter', { expression: '[BATTERY_PERCENT]' }));

/** Battery and date in one font's readout face; battery turns to the warning colour at 15% or less. */
function readoutsXml(font: FontId): string {
  const face = readoutFace(font)!;
  const text = (box: { x: number; y: number; width: number; height: number }, content: string, role: 'ink' | 'warning') =>
    tag('PartText', box, tag('Text', { align: 'CENTER' }, tag('BitmapFont', {
      family: readoutFamily(font), size: face.height, color: palettes.FUSION[role],
    }, tag('Transform', { target: 'color', value: paletteColour(role) }) + content)));
  return condition([{ when: lowBattery, then: text(layout.battery, batteryTemplate, 'warning') }], text(layout.battery, batteryTemplate, 'ink'))
    + text(layout.date, dateTemplate, 'ink');
}

/** Decoration retains literal colours and exactly the accepted motion trees. */
function paletteXml(id: PaletteId, compiled: NexusArtwork): string {
  const p = palettes[id];
  const speedSetting = settingById('motion_speed');
  // Every speed's scene has the same top-level shape, so index i is the same node in all of them.
  const base = compiled.scenes[id].STANDARD;
  const decoration = base.map((node, index) => {
    if (node.kind !== 'switch') return nodeXml(node, p);
    return selectXml(speedSetting, Object.fromEntries((Object.keys(speeds) as Speed[]).map(speed => {
      const chosen = speed === 'STILL' ? stillNodes([node]) : [compiled.scenes[id][speed][index]];
      const body = chosen.map(n => nodeXml(n, p)).join('');
      // Compare requires a child even when Still removes an overlay completely.
      // Empty groups draw nothing; moving branches need no extra container.
      return [speed, body || tag('Group', { ...canvas, name: `${id}_${node.setting}_still` })];
    })));
  }).join('');
  return tag('Group', { ...canvas, name: `palette_${id}` }, decoration);
}

/** One clock collection for all palettes, with native size/centering unchanged. */
function interactiveTextXml(): string {
  const [fontSetting, glowSetting, sizeSetting] = ['clock_font', 'glow', 'clock_size'].map(settingById);
  const clocks = selectXml(fontSetting, Object.fromEntries(nexusFonts.map(font => [font,
    selectXml(glowSetting, Object.fromEntries(glows.map(glow => [glow,
      selectXml(sizeSetting, Object.fromEntries((Object.keys(clockSizes) as ClockSize[]).map(size => [size,
        clockXml(clockFamily(font, glow), clockSizes[size] * clockScale, '#ffffff')])))])))])));
  // TimeText's inline BitmapFont cannot contain Transform in the pinned WFF 4
  // schema. Tint its stationary parent; keep glyph sizes and boxes untouched.
  const clock = tag('Group', { ...canvas, name: 'clock_tint', tintColor: palettes.FUSION.ink },
    tag('Transform', { target: 'tintColor', value: paletteColour('ink') }) + clocks);
  const readouts = selectXml(fontSetting, Object.fromEntries(nexusFonts.map(font => [font, readoutsXml(font)])));
  return clock + readouts;
}

/** Every BitmapFont NEXUS uses: three glow levels plus a readout face per font. */
function bitmapFontsXml(): string {
  return nexusFonts.flatMap(font => [...glows.map(glow => bitmapFontXml(clockFamily(font, glow), clockFace(font))), bitmapFontXml(readoutFamily(font), readoutFace(font)!)]).join('');
}

/** Build watchface.xml. Pure: the same inputs always give the same bytes. */
export async function compileWatchface(): Promise<string> {
  const compiled = await artwork();
  const paletteSetting = settingById('palette'), fontSetting = settingById('clock_font');
  const ids = Object.keys(palettes) as PaletteId[];
  // Scene already supplies opaque black; a second full-screen ground draw is redundant.
  const interactive = tag('Group', { ...canvas, name: 'interactive' },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }) + selectXml(paletteSetting, Object.fromEntries(ids.map(id => [id, paletteXml(id, compiled)]))) + interactiveTextXml());
  const ambient = tag('Group', { ...canvas, name: 'ambient', alpha: 0 },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 255 }) +
    selectXml(paletteSetting, Object.fromEntries(ids.map(id => [id,
      selectXml(fontSetting, Object.fromEntries(nexusFonts.map(font => [font, clockXml(clockFamily(font, 'OFF'), ambientScale, palettes[id].line, ambientAlpha)])))]))));
  const face = tag('WatchFace', { width: 432, height: 432 },
    tag('Metadata', { key: 'PREVIEW_TIME', value: '10:45:00' }) +
    tag('BitmapFonts', {}, bitmapFontsXml()) +
    tag('UserConfigurations', {}, configurationXml(editorSettings)) +
    tag('Scene', { backgroundColor: '#000000' }, interactive + ambient + slotXml(slot)));
  return '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose/faces/nexus; edit the design, then run npm run compose. -->\n' + breakLines(face) + '\n';
}

/** Android string resources: face name, editor labels and the slot's label. */
export function stringsXml(): string {
  const strings: Record<string, string> = { face_name: 'NEXUS', ...editorStrings(editorSettings), [slot.name]: 'TIMER / SHORTCUT' };
  return '<?xml version="1.0" encoding="utf-8"?>\n' + tag('resources', {}, Object.entries(strings).map(([name, s]) => tag('string', { name }, escapeXml(s))).join('')) + '\n';
}
