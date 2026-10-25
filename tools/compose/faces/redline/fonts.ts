/**
 * REDLINE font layer: the eight selectable clock fonts and their readout faces.
 *
 * Every font is baked into white glyph masks at build time (see src/fonts).
 * All clock fonts share one digit ink height and fit the same width as 0.3.2's
 * accepted clock, so changing font never moves the layout. Date and battery use
 * a small face of the same family. REDLINE keeps its original system-font readouts.
 */
import type { FaceSpec, GlyphFace, InkSource } from '../../src/fonts/glyphs.ts';
import { layoutFace } from '../../src/fonts/glyphs.ts';
import { outlineSource } from '../../src/fonts/outline.ts';
import { litCells } from '../../src/editor/letters.ts';

/* ------------------------------------------------------------- vector fonts */

/** Segment polygons of the original REDLINE digits, in a 30×54 design box. */
const segments: Record<string, string> = {
  a: '7,3 23,3 26,6 23,9 7,9 4,6', g: '7,24 23,24 26,27 23,30 7,30 4,27', d: '7,45 23,45 26,48 23,51 7,51 4,48',
  f: '3,8 6,11 6,23 3,26 0,23 0,11', b: '27,8 30,11 30,23 27,26 24,23 24,11',
  e: '3,29 6,32 6,44 3,47 0,44 0,32', c: '27,29 30,32 30,44 27,47 24,44 24,32',
};
/** Which segments each digit lights. */
const digitSegments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];

/** The original angular REDLINE digits. 1 has two full-height stems so 11:11 centres vertically. */
const redlineSource: InkSource = {
  box: c => {
    if (c === ':') return [4, 16, 8, 38];
    if (c === '1') return [24, 3, 30, 51];
    if ('37'.includes(c)) return [4, 3, 30, 51];
    return [0, 3, 30, 51];
  },
  body: c => {
    if (c === ':') return '<rect x="4" y="16" width="4" height="5"/><rect x="4" y="33" width="4" height="5"/>';
    if (c === '1') return '<polygon points="27,3 30,6 30,23 27,26 24,23 24,6"/><polygon points="27,28 30,31 30,48 27,51 24,48 24,31"/>';
    return [...digitSegments[Number(c)]].map(s => `<polygon points="${segments[s]}"/>`).join('');
  },
};

/** Dot-matrix cells: 8-unit pitch, 4.5-unit square dots, from the 5×7 alphabet. */
const dotPitch = 8;
/** Dot-matrix source; `dotSize` is the lit square inside each 8-unit cell. */
const dotSource = (dotSize: number): InkSource => ({
  box: c => {
    const lit = litCells(c);
    const xs = lit.map(([x]) => x), ys = lit.map(([, y]) => y);
    // Widths are tight to the lit columns, so a narrow 1 does not push the time off centre.
    // Heights keep all seven rows (except punctuation) so every character shares one baseline.
    const full = c !== ':' && c !== '.';
    const x1 = Math.min(...xs), x2 = Math.max(...xs);
    const y1 = full ? 0 : Math.min(...ys), y2 = full ? 6 : Math.max(...ys);
    return [x1 * dotPitch, y1 * dotPitch, x2 * dotPitch + dotSize, y2 * dotPitch + dotSize];
  },
  body: c => litCells(c).map(([x, y]) => `<rect x="${x * dotPitch}" y="${y * dotPitch}" width="${dotSize}" height="${dotSize}" rx="0.4"/>`).join(''),
});

/** DSEG7 with every digit's unlit segments drawn as a faint "8" ghost, like a real LCD. */
function lcdSource(): InkSource {
  const dseg = outlineSource('dseg/DSEG7Classic-Bold.ttf');
  return { ...dseg, ghost: c => ('0123456789'.includes(c) ? dseg.body('8') : '') };
}

/* --------------------------------------------------------------- catalogue */

/** Selectable clock font IDs, in editor order. Stable: they are stored in saved settings. */
export const fontIds = ['REDLINE', 'SEGMENT', 'RAJDHANI', 'OXANIUM', 'CHAKRA', 'TECHMONO', 'VT323', 'DOT'] as const;
export type FontId = typeof fontIds[number];

/** Editor text for each font: full label, and a short caption for icon-only editors. */
export const fontLabels: Record<FontId, { label: string; caption: string }> = {
  REDLINE: { label: 'REDLINE ANGULAR', caption: 'REDLINE' },
  SEGMENT: { label: 'SEGMENT LCD', caption: 'LCD' },
  RAJDHANI: { label: 'RAJDHANI', caption: 'RAJDHANI' },
  OXANIUM: { label: 'OXANIUM', caption: 'OXANIUM' },
  CHAKRA: { label: 'CHAKRA PETCH', caption: 'CHAKRA' },
  TECHMONO: { label: 'SHARE TECH MONO', caption: 'MONO' },
  VT323: { label: 'VT323 TERMINAL', caption: 'VT323' },
  DOT: { label: 'DOT MATRIX', caption: 'DOT' },
};

/** Cell height of every clock glyph at Medium. The BitmapFont size scales it for Small/Large. */
export const clockCellHeight = 118;
/** Widest possible hh:mm at Medium; equals 0.3.2's accepted clock (4 × 74 + 12). */
export const clockMaxWidth = 308;
/** Digit ink height at Medium (0.3.2's REDLINE digits are 104.9 tall in a 118 cell). */
const clockInk = 104.9;

/** Shared readout cell: capitals 15 units tall, close to 0.3.2's 21-unit system date. */
const readoutCell = { height: 24, inkHeight: 15, pad: 1 } as const;
/** Readout glow is narrower than the clock's: the cells are only 24 units tall. */
export const readoutBlur = 0.5;
/** Characters the date and battery can show: capitals, digits, '%' and '_' as the word gap. */
export const readoutChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%_';

/** How each font's clock face is built from its source. */
function clockSpec(id: FontId): FaceSpec {
  const base = { chars: '0123456789:', height: clockCellHeight, inkHeight: clockInk, reference: '0', pad: 5, centreColon: true, maxClockWidth: clockMaxWidth };
  switch (id) {
    // REDLINE keeps 0.3.2's tight 1-unit pad and its 10% horizontal stretch.
    case 'REDLINE': return { ...base, source: redlineSource, pad: 1, stretchX: (72 / 30) / (118 / 54) };
    case 'SEGMENT': return { ...base, source: lcdSource(), tabular: true };
    case 'RAJDHANI': return { ...base, source: outlineSource('rajdhani/Rajdhani-SemiBold.ttf') };
    case 'OXANIUM': return { ...base, source: outlineSource('oxanium/Oxanium-SemiBold.ttf') };
    case 'CHAKRA': return { ...base, source: outlineSource('chakra-petch/ChakraPetch-SemiBold.ttf') };
    case 'TECHMONO': return { ...base, source: outlineSource('share-tech-mono/ShareTechMono-Regular.ttf') };
    case 'VT323': return { ...base, source: outlineSource('vt323/VT323-Regular.ttf') };
    case 'DOT': return { ...base, source: dotSource(4.5) };
  }
}

/** How each font's readout face is built; REDLINE has none (it keeps the system font). */
function readoutSpec(id: FontId): FaceSpec | null {
  const base = { chars: readoutChars, ...readoutCell, reference: 'H' };
  switch (id) {
    case 'REDLINE': return null;
    // DSEG7 has no letters; its 14-segment sibling does.
    case 'SEGMENT': return { ...base, source: outlineSource('dseg/DSEG14Classic-Bold.ttf') };
    case 'RAJDHANI': return { ...base, source: outlineSource('rajdhani/Rajdhani-SemiBold.ttf') };
    case 'OXANIUM': return { ...base, source: outlineSource('oxanium/Oxanium-SemiBold.ttf') };
    case 'CHAKRA': return { ...base, source: outlineSource('chakra-petch/ChakraPetch-SemiBold.ttf') };
    case 'TECHMONO': return { ...base, source: outlineSource('share-tech-mono/ShareTechMono-Regular.ttf') };
    case 'VT323': return { ...base, source: outlineSource('vt323/VT323-Regular.ttf') };
    // Small readouts need fuller dots to stay legible at 15 units tall.
    case 'DOT': return { ...base, source: dotSource(6.5), pad: 1.2 };
  }
}

/** Laid-out faces, computed once per process. */
const clockFaces = new Map<FontId, GlyphFace>();
const readoutFaces = new Map<FontId, GlyphFace | null>();

/** The clock face for a font. */
export function clockFace(id: FontId): GlyphFace {
  if (!clockFaces.has(id)) clockFaces.set(id, layoutFace(clockSpec(id)));
  return clockFaces.get(id)!;
}

/** The readout face for a font, or null when it uses the system font. */
export function readoutFace(id: FontId): GlyphFace | null {
  if (!readoutFaces.has(id)) {
    const spec = readoutSpec(id);
    readoutFaces.set(id, spec ? layoutFace(spec) : null);
  }
  return readoutFaces.get(id)!;
}

/* ----------------------------------------------------------- size and glow */

/** Clock size multipliers. Medium is 0.3.2's 117.5-unit clock. */
export const clockSizes = { SMALL: 0.85, MEDIUM: 117.5 / 118, LARGE: 1.1 } as const;
export type ClockSize = keyof typeof clockSizes;
/** Ambient clock: one compact size for every font (0.3.2's 94 units). */
export const ambientScale = 94 / 118;

/** Glow choices. OFF reuses the crisp ambient masks. */
export const glows = ['OFF', 'LOW', 'HIGH'] as const;
export type GlowId = typeof glows[number];
