/**
 * REDLINE preview layer: render a frame as SVG from the same scene, glyph cells and layout.
 *
 * The preview shows the ideal steady-state pose of Smooth motion. Glyph images are
 * the same masks the watch receives, so clock and readout shapes match exactly.
 * System-font text (REDLINE readouts, complication text) is approximated.
 */
import type { Frame } from '../../src/core/frame.ts';
import { clockText } from '../../src/core/frame.ts';
import type { GlyphFace, Glow } from '../../src/fonts/glyphs.ts';
import { glyphRun } from '../../src/fonts/svg.ts';
import { slotSvg } from '../../src/wff/complication.ts';
import { escapeXml } from '../../src/wff/xml.ts';
import { nodeSvg } from '../../src/svg/nodes.ts';
import type { ImageData } from '../../src/svg/nodes.ts';
import { defaults } from '../../src/editor/catalogue.ts';
import { maskImages } from './assets.ts';
import { layout, palettes, scene } from './design.ts';
import type { MotionStyle, PaletteId, Speed } from './design.ts';
import { editorSettings } from './editor.ts';
import { ambientScale, clockFace, clockSizes, readoutBlur, readoutFace } from './fonts.ts';
import type { ClockSize, FontId, GlowId } from './fonts.ts';
import { ambientAlpha, ambientInk, ink, slot, warning } from './render.ts';

/** Editor choices for a frame, with every unset setting at its default. */
export const choices = (f: Frame): Record<string, string> => ({ ...defaults(editorSettings), ...f.config });

/** The clock, interactive or ambient. */
function clockSvg(f: Frame, config: Record<string, string>): string {
  const font = config.clock_font as FontId;
  const face = clockFace(font);
  const scale = f.ambient ? ambientScale : clockSizes[config.clock_size as ClockSize];
  const top = 216 - (face.height * scale) / 2;
  const text = clockText(f.time, f.hour24);
  return f.ambient
    ? glyphRun(face, text, 216, top, scale, ambientInk, 'OFF', ambientAlpha / 255)
    : glyphRun(face, text, 216, top, scale, ink, config.glow as GlowId);
}

/** Readout strings as the watch's templates produce them (English abbreviations). */
export function readoutText(f: Frame): { battery: string; date: string[] } {
  const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][f.time.getUTCDay()];
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][f.time.getUTCMonth()];
  return { battery: `${f.battery}%`, date: [day, String(f.time.getUTCDate()).padStart(2, '0'), month] };
}

/** Battery and date, in the font's readout face or the system font. */
function readoutsSvg(f: Frame, font: FontId): string {
  const { battery, date } = readoutText(f);
  const batteryColour = f.battery <= 15 ? warning : ink;
  const face = readoutFace(font);
  const centre = (box: { x: number; width: number }) => box.x + box.width / 2;
  if (!face) {
    const text = (box: { x: number; y: number; width: number; height: number }, size: number, content: string, colour: string) =>
      `<text x="${centre(box)}" y="${box.y + box.height / 2}" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-size="${size}" fill="${colour}">${escapeXml(content)}</text>`;
    return text(layout.battery, 20, battery, batteryColour) + text(layout.date, 21, date.join(' '), ink);
  }
  const row = (box: { x: number; y: number; width: number; height: number }, content: string, colour: string) =>
    glyphRun(face, content, centre(box), box.y + (box.height - face.height) / 2, 1, colour, 'LOW', 1, readoutBlur);
  return row(layout.battery, battery, batteryColour) + row(layout.date, date.join('_'), ink);
}

/** Options for previewing the optimized (cached) tree instead of the source vectors. */
export interface PreviewOptions { optimized?: { nodes: Parameters<typeof nodeSvg>[0][]; images: ImageData } }

/** A complete 432×432 preview of one frame. */
export function previewSvg(f: Frame, options: PreviewOptions = {}): string {
  const config = choices(f);
  const palette = palettes[config.palette as PaletteId] ?? palettes.REFERENCE;
  const images = { ...maskImages(palette), ...options.optimized?.images };
  let body: string;
  if (f.ambient) {
    body = clockSvg(f, config);
  } else {
    const nodes = options.optimized?.nodes ?? scene(config.motion_speed as Speed, config.motion_style as MotionStyle);
    body = nodes.map(n => nodeSvg(n, { ...f, config }, palette, images)).join('')
      + clockSvg(f, config) + readoutsSvg(f, config.clock_font as FontId) + slotSvg(slot, f.complication);
  }
  const ground = f.ambient ? '#000000' : palette.ground;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><defs><clipPath id="round"><circle cx="216" cy="216" r="216"/></clipPath></defs><g clip-path="url(#round)"><rect width="432" height="432" fill="${ground}"/>${body}</g></svg>`;
}
