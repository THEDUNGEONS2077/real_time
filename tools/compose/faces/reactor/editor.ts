/**
 * REACTOR editor catalogue: every setting shown in Galaxy Wearable and on the watch.
 *
 * IDs and option values are stable once released, because saved choices refer to them.
 * There is no rotation-style choice: every ring reads the live clock, so it does not wait
 * for an animation restart on wake. Device smoothness still needs user acceptance.
 */
import type { EditorSetting } from '../../src/editor/catalogue.ts';
import { setting, toggleSetting } from '../../src/editor/catalogue.ts';
import { clockFace, fontLabels } from '../../src/fonts/catalog.ts';
import type { FontId } from '../../src/fonts/catalog.ts';
import { glyphOf } from '../../src/fonts/glyphs.ts';
import { effectLabels, effects, palettes, speedLabels } from './design.ts';
import type { PaletteId, Speed } from './design.ts';

/** The instrument and terminal fonts REACTOR offers, default first. */
export const reactorFonts: FontId[] = ['OXANIUM', 'RAJDHANI', 'TECHMONO', 'SEGMENT'];

const accent = palettes.EMBER.accent;

/** "12" drawn with the font's own glyphs, for its option tile. */
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
  return `<g fill="${palettes.EMBER.ink}">${parts.join('')}</g>`;
}

const speedCaptions: Record<Speed, string> = { STILL: 'OFF', SLOW: '0.5X', STANDARD: '1X', FAST: '2X' };

/** The full catalogue, in editor order. */
export const editorSettings: EditorSetting[] = [
  setting('palette', 'COLOURS', 'EMBER', (Object.keys(palettes) as PaletteId[]).map(id => ({
    id, label: id, caption: id, colour: palettes[id].accent,
    art: `<path d="M29 30A19 19 0 0 1 67 30" fill="none" stroke="${palettes[id].accent}" stroke-width="5"/><path d="M29 36A19 19 0 0 0 67 36" fill="none" stroke="${palettes[id].accentDeep}" stroke-width="5"/>`,
  }))),
  setting('clock_font', 'CLOCK FONT', 'OXANIUM', reactorFonts.map(id => ({
    id, label: fontLabels[id].label, caption: fontLabels[id].caption, colour: accent, art: fontSample(id),
  }))),
  setting('clock_size', 'CLOCK SIZE', 'MEDIUM', [
    { id: 'SMALL', label: 'SMALL', caption: 'S', colour: accent },
    { id: 'MEDIUM', label: 'MEDIUM', caption: 'M', colour: accent },
    { id: 'LARGE', label: 'LARGE', caption: 'L', colour: accent },
  ]),
  setting('glow', 'CLOCK GLOW', 'LOW', [
    { id: 'OFF', label: 'OFF', caption: 'OFF', colour: '#87909a' },
    { id: 'LOW', label: 'LOW', caption: 'LOW', colour: accent },
    { id: 'HIGH', label: 'HIGH', caption: 'HIGH', colour: accent },
  ]),
  setting('motion_speed', 'MOTION SPEED', 'SLOW', (Object.keys(speedLabels) as Speed[]).map(id => ({
    id, label: speedLabels[id], caption: speedCaptions[id], colour: accent,
  }))),
  ...effects.map(id => toggleSetting(id, effectLabels[id], accent)),
];

/** Look up a setting by ID. */
export const settingById = (id: string): EditorSetting => {
  const found = editorSettings.find(s => s.id === id);
  if (!found) throw new Error(`Unknown setting ${id}`);
  return found;
};
