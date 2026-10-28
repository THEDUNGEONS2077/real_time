/**
 * NEXUS preview layer: render a frame as SVG from the same scene, masks and glyph cells.
 * Rings show their exact live-clock pose; the watch draws the same pose every frame.
 */
import type { Frame } from '../../src/core/frame.ts';
import { clockText } from '../../src/core/frame.ts';
import { defaults } from '../../src/editor/catalogue.ts';
import { clockFace, clockSizes, readoutBlur, readoutFace } from '../../src/fonts/catalog.ts';
import type { ClockSize, FontId, GlowId } from '../../src/fonts/catalog.ts';
import { glyphRun } from '../../src/fonts/svg.ts';
import { nodeSvg } from '../../src/svg/nodes.ts';
import type { ImageData } from '../../src/svg/nodes.ts';
import { slotSvg } from '../../src/wff/complication.ts';
import { clockScale, layout, masks, palettes, scene } from './design.ts';
import type { PaletteId, Speed } from './design.ts';
import { editorSettings } from './editor.ts';
import { ambientAlpha, ambientScale, slot } from './render.ts';
import { maskSvgs } from './masks.ts';

/** Editor choices for a frame, with unset settings at their defaults. */
export const choices = (f: Frame): Record<string, string> => ({ ...defaults(editorSettings), ...f.config });

/** Mask images tinted for one palette, as WFF's tintColor does (colour replaces white, alpha kept). */
export function maskImages(id: PaletteId): ImageData {
  const p = palettes[id];
  return Object.fromEntries(Object.entries(maskSvgs()).map(([name, svg]) =>
    [name, 'data:image/svg+xml;base64,' + Buffer.from(svg.replaceAll('white', p[masks[name].role])).toString('base64')]));
}

/** Readout strings as the watch's templates produce them (English abbreviations). */
export function readoutText(f: Frame): { battery: string; date: string } {
  const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][f.time.getUTCDay()];
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][f.time.getUTCMonth()];
  return { battery: `${f.battery}%`, date: `${day}_${String(f.time.getUTCDate()).padStart(2, '0')}_${month}` };
}

/** A complete 432×432 preview of one frame. */
export function previewSvg(f: Frame): string {
  const config = choices(f);
  const id = (config.palette in palettes ? config.palette : 'FUSION') as PaletteId;
  const p = palettes[id];
  const font = config.clock_font as FontId;
  const face = clockFace(font);
  const text = clockText(f.time, f.hour24);
  let body: string;
  if (f.ambient) {
    const top = 216 - (face.height * ambientScale) / 2;
    body = glyphRun(face, text, 216, top, ambientScale, p.line, 'OFF', ambientAlpha / 255);
  } else {
    const images = maskImages(id);
    const scale = clockSizes[config.clock_size as ClockSize] * clockScale;
    const readout = readoutFace(font)!;
    const { battery, date } = readoutText(f);
    const row = (box: { x: number; y: number; width: number; height: number }, content: string, colour: string) =>
      glyphRun(readout, content, box.x + box.width / 2, box.y + (box.height - readout.height) / 2, 1, colour, 'LOW', 1, readoutBlur);
    body = scene(config.motion_speed as Speed).map(n => nodeSvg(n, { ...f, config }, p, images)).join('')
      + glyphRun(face, text, 216, 216 - (face.height * scale) / 2, scale, p.ink, config.glow as GlowId)
      + row(layout.battery, battery, f.battery <= 15 ? p.warning : p.ink) + row(layout.date, date, p.ink)
      + slotSvg(slot, f.complication);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><defs><clipPath id="round"><circle cx="216" cy="216" r="216"/></clipPath></defs><g clip-path="url(#round)"><rect width="432" height="432" fill="#000000"/>${body}</g></svg>`;
}
