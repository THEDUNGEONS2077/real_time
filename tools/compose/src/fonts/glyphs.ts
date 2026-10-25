/**
 * Font layer: lay out glyph cells and bake them as white masks for WFF BitmapFonts.
 *
 * Every font, whether a TrueType file or one of our vector designs, becomes an
 * InkSource. `layoutFace` scales it so all clock fonts share one ink height and fit
 * one width. Each glyph gets a tight cell: its ink plus a small pad, no extra
 * tracking. That keeps narrow digits such as 1 visually centred (FACE_STANDARD).
 * The same cells drive the WFF Character widths and the SVG previews.
 */

/** Glyph shapes in a source's own design units (y down). */
export interface InkSource {
  /** Ink bounding box [x1, y1, x2, y2]. */
  box(c: string): [number, number, number, number];
  /** SVG elements drawing the glyph, filled by the caller. */
  body(c: string): string;
  /** Optional faint background shape, such as the unlit segments of an LCD digit. */
  ghost?(c: string): string;
}

/** How a source becomes a face. */
export interface FaceSpec {
  source: InkSource;
  /** Characters to bake. '_' is always a blank word gap, never drawn. */
  chars: string;
  /** Cell height, which is also the BitmapFont's natural size. */
  height: number;
  /** Height of the reference ink (digits, or capitals for readouts). */
  inkHeight: number;
  /** Character whose ink height and vertical position define the scale and baseline. */
  reference: string;
  /** Clear space on each side of the ink, in cell units. Holds the baked glow. */
  pad: number;
  /** Extra horizontal stretch, for designs drawn narrower than they are shown. */
  stretchX?: number;
  /** Give every digit the union width of all digits (LCD-style fixed cells). */
  tabular?: boolean;
  /** Centre the colon on the digits' vertical middle, as clocks do. */
  centreColon?: boolean;
  /** Shrink the whole face so four widest digits plus a colon fit this width. */
  maxClockWidth?: number;
}

/** One baked cell. */
export interface Glyph { char: string; width: number; height: number; body: string; ghost: string }

/** A laid-out face: every glyph cell for one font at one role (clock or readout). */
export interface GlyphFace { height: number; glyphs: Map<string, Glyph> }

const digits = '0123456789';

/** Ink box of a source character, with tabular digits widened to the union of all digits. */
function inkBox(spec: FaceSpec, c: string): [number, number, number, number] {
  const box = spec.source.box(c);
  if (!spec.tabular || !digits.includes(c)) return box;
  const all = [...digits].map(d => spec.source.box(d));
  return [Math.min(...all.map(b => b[0])), box[1], Math.max(...all.map(b => b[2])), box[3]];
}

/** Lay out every glyph at a given scale factor. */
function layoutAt(spec: FaceSpec, factor: number): GlyphFace {
  const [, refTop, , refBottom] = spec.source.box(spec.reference);
  const inkHeight = spec.inkHeight * factor;
  const sy = inkHeight / (refBottom - refTop);
  const sx = sy * (spec.stretchX ?? 1);
  // The reference ink sits vertically centred in the cell.
  const top = (spec.height - inkHeight) / 2;
  const glyphs = new Map<string, Glyph>();
  for (const c of spec.chars) {
    if (c === '_') {
      // Word gap: a blank cell about a third of the ink height wide.
      glyphs.set(c, { char: c, width: Math.max(2, Math.round(inkHeight * 0.32)), height: spec.height, body: '', ghost: '' });
      continue;
    }
    const [x1, y1, x2, y2] = inkBox(spec, c);
    const width = Math.max(1, Math.round((x2 - x1) * sx + 2 * spec.pad));
    const ox = (width - (x2 - x1) * sx) / 2 - x1 * sx;
    let oy = top - refTop * sy;
    if (c === ':' && spec.centreColon) {
      // Move the colon so its ink centre matches the digits' ink centre.
      oy += ((refTop + refBottom) / 2 - (y1 + y2) / 2) * sy;
    }
    const place = (inner: string) => (inner ? `<g transform="translate(${round(ox)},${round(oy)}) scale(${round(sx)},${round(sy)})">${inner}</g>` : '');
    const ghost = spec.source.ghost?.(c) ?? '';
    glyphs.set(c, { char: c, width, height: spec.height, body: place(spec.source.body(c)), ghost: place(ghost) });
  }
  return { height: spec.height, glyphs };
}

/** Round transform numbers so generated SVG (and its hashes) stays stable and compact. */
const round = (n: number) => Number(n.toFixed(4));

/** Widest possible hh:mm: four of the widest digit plus the colon. */
export const widestClock = (face: GlyphFace): number =>
  4 * Math.max(...[...digits].map(d => face.glyphs.get(d)!.width)) + face.glyphs.get(':')!.width;

/** Lay out a face, shrinking it once if it would exceed its clock width. */
export function layoutFace(spec: FaceSpec): GlyphFace {
  const face = layoutAt(spec, 1);
  if (!spec.maxClockWidth) return face;
  const widest = widestClock(face);
  if (widest <= spec.maxClockWidth) return face;
  // Shrink ink and pad-free widths proportionally; rounding can leave a pixel, so step down until it fits.
  for (let factor = spec.maxClockWidth / widest; factor > 0.5; factor -= 0.002) {
    const fitted = layoutAt(spec, factor);
    if (widestClock(fitted) <= spec.maxClockWidth) return fitted;
  }
  throw new Error('Face cannot fit its clock width.');
}

/** Glow strength baked around a glyph. OFF is a crisp mask (also the ambient clock). */
export type Glow = 'OFF' | 'LOW' | 'HIGH';

/** Blur radius and opacity per glow level, in cell units. A 5-unit pad holds about 2.3 blur radii of HIGH glow. */
const glowStyle: Record<Glow, { blur: number; opacity: number } | null> = {
  OFF: null,
  LOW: { blur: 1.1, opacity: 0.35 },
  HIGH: { blur: 2.2, opacity: 0.8 },
};

/** Opacity of an LCD ghost shape relative to the lit ink. */
const ghostOpacity = 0.09;

/** Complete SVG mask for one glyph. White ink; WFF tints it with the BitmapFont colour. */
export function glyphSvg(g: Glyph, glow: Glow, blurScale = 1): string {
  const style = glowStyle[glow];
  const halo = style && g.body ? `<g opacity="${style.opacity}" filter="url(#glow)">${g.body}</g>` : '';
  const filter = style ? `<defs><filter id="glow" x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation="${style.blur * blurScale}"/></filter></defs>` : '';
  const ghost = g.ghost ? `<g opacity="${ghostOpacity}">${g.ghost}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}">${filter}<g fill="white">${ghost}${halo}${g.body}</g></svg>`;
}

/** Android resource name for a glyph: lowercase letters, digits and named symbols only. */
export function glyphResource(prefix: string, c: string): string {
  const names: Record<string, string> = { ':': 'colon', '%': 'percent', '_': 'gap' };
  return `${prefix}_${names[c] ?? c.toLowerCase()}`;
}

/** Total advance of a string in cell units (before BitmapFont size scaling). */
export function textWidth(face: GlyphFace, text: string): number {
  return [...text].reduce((sum, c) => sum + glyphOf(face, c).width, 0);
}

/** Look up a glyph, mapping lowercase to the uppercase cell as the WFF font does. */
export function glyphOf(face: GlyphFace, c: string): Glyph {
  const g = face.glyphs.get(c) ?? face.glyphs.get(c.toUpperCase());
  if (!g) throw new Error(`Face has no glyph for ${JSON.stringify(c)}`);
  return g;
}
