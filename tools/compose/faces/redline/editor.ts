/**
 * REDLINE editor catalogue: every setting shown in Galaxy Wearable and on the watch.
 *
 * Order is the order the editors list them. IDs and option values are stable,
 * because saved choices and measurement reports refer to them. Settings new in
 * 1.0 (clock_font, clock_size, glow) start at defaults that reproduce 0.3.2.
 */
import type { EditorSetting } from '../../src/editor/catalogue.ts';
import { setting, toggleSetting } from '../../src/editor/catalogue.ts';
import { glyphOf } from '../../src/fonts/glyphs.ts';
import { effectLabels, effects, paletteLabels, palettes, speedLabels } from './design.ts';
import type { PaletteId, Speed } from './design.ts';
import { clockFace, fontIds, fontLabels } from './fonts.ts';
import type { FontId } from './fonts.ts';

const red = palettes.REFERENCE.accent;

/** "12" drawn with the font's own glyphs, sized to the top half of a 96-unit tile. */
function fontSample(id: FontId): string {
  const face = clockFace(id);
  const chars = [...'12'].map(c => glyphOf(face, c));
  const width = chars.reduce((sum, g) => sum + g.width, 0);
  const scale = Math.min(52 / width, 38 / face.height);
  let x = 48 - (width * scale) / 2;
  const y = 40 - (face.height * scale) / 2;
  const parts = chars.map(g => {
    const part = `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${scale.toFixed(4)})"><g opacity="0.09">${g.ghost}</g>${g.body}</g>`;
    x += g.width * scale;
    return part;
  });
  return `<g fill="#edf0f1">${parts.join('')}</g>`;
}

/** Captions use only characters in the 5×7 caption alphabet. */
const speedCaptions: Record<Speed, string> = { STILL: 'OFF', SLOW: '0.5X', STANDARD: '1X', FAST: '2X' };

/** The full catalogue, in editor order. */
export const editorSettings: EditorSetting[] = [
  setting('palette', 'COLOURS', 'REFERENCE', (Object.keys(palettes) as PaletteId[]).map(id => ({
    id, label: paletteLabels[id], caption: id === 'REFERENCE' ? 'RED' : id, colour: palettes[id].accent,
  }))),
  setting('clock_font', 'CLOCK FONT', 'REDLINE', fontIds.map(id => ({
    id, label: fontLabels[id].label, caption: fontLabels[id].caption, colour: red, art: fontSample(id),
  }))),
  setting('clock_size', 'CLOCK SIZE', 'MEDIUM', [
    { id: 'SMALL', label: 'SMALL', caption: 'S', colour: red },
    { id: 'MEDIUM', label: 'MEDIUM', caption: 'M', colour: red },
    { id: 'LARGE', label: 'LARGE', caption: 'L', colour: red },
  ]),
  setting('glow', 'CLOCK GLOW', 'LOW', [
    { id: 'OFF', label: 'OFF', caption: 'OFF', colour: '#87909a' },
    { id: 'LOW', label: 'LOW', caption: 'LOW', colour: red },
    { id: 'HIGH', label: 'HIGH', caption: 'HIGH', colour: red },
  ]),
  setting('motion_speed', 'MOTION SPEED', 'SLOW', (Object.keys(speedLabels) as Speed[]).map(id => ({
    id, label: speedLabels[id], caption: speedCaptions[id], colour: red,
  }))),
  setting('motion_style', 'ROTATION STYLE', 'SMOOTH', [
    { id: 'SMOOTH', label: 'SMOOTH / STEADY', caption: 'SMOOTH', colour: red },
    { id: 'DYNAMIC', label: 'DYNAMIC / MODULATED', caption: 'DYN', colour: red },
  ]),
  ...effects.map(id => toggleSetting(id, effectLabels[id], red)),
];

/** Look up a setting by ID. */
export const settingById = (id: string): EditorSetting => {
  const found = editorSettings.find(s => s.id === id);
  if (!found) throw new Error(`Unknown setting ${id}`);
  return found;
};
