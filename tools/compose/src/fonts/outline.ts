/**
 * Font layer: read glyph outlines from the pinned OFL TrueType files.
 *
 * Fonts are build inputs only. The watch receives baked PNG masks, never a TTF,
 * so there is no runtime font fallback and previews match the watch exactly.
 * Each file is checked against its pinned SHA-256 before use.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error opentype.js 1.3 ships no type declarations; only parse/charToGlyph/getPath are used.
import opentype from 'opentype.js';
import type { InkSource } from './glyphs.ts';

/** Directory holding the committed fonts and their licences. */
const fontDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../fonts');

/** Pinned font files. A changed file must be reviewed and its hash updated deliberately. */
export const fontFiles = {
  'dseg/DSEG7Classic-Bold.ttf': 'd16181c4eeae29e695ca547ee9be437d01d4909ac1f8f349f04176dc6858873b',
  'dseg/DSEG14Classic-Bold.ttf': '10755549540ea735001907ee25344443ff3ee613594fb063bb5cb55d7bc85935',
  'rajdhani/Rajdhani-SemiBold.ttf': '94bbd25a18ca665999feb05a537de9fd2b860dcfb78bbe9ca00270825bf235da',
  'oxanium/Oxanium-SemiBold.ttf': 'e2d77ec4ee67b0152166adf5d6393360550a012c2066e0d4589053e14a733cdc',
  'chakra-petch/ChakraPetch-SemiBold.ttf': '45264de3204ddbd5fb3e14a2402acd5c630d16650ae5fc221d2c52da46a6734b',
  'share-tech-mono/ShareTechMono-Regular.ttf': '9ceab1f87414829af259c0f537573ae03ef7dd3147c0b27a36a1a0beb6732677',
  'vt323/VT323-Regular.ttf': 'cf4de751ada78ceac033dbe16a687742939995b77bc2a052ae17a4957958594d',
} as const;

/** One committed font file. */
export type FontFile = keyof typeof fontFiles;

/** Minimal shape of the opentype.js objects used here. */
interface OpenTypePath { toPathData(decimals: number): string; getBoundingBox(): { x1: number; y1: number; x2: number; y2: number } }
interface OpenTypeFont { unitsPerEm: number; charToGlyph(c: string): { index: number; getPath(x: number, y: number, size: number): OpenTypePath } }

/** Parsed fonts, loaded once per process. */
const loaded = new Map<FontFile, OpenTypeFont>();

/** Load and verify one pinned font. */
function load(file: FontFile): OpenTypeFont {
  const cached = loaded.get(file);
  if (cached) return cached;
  const bytes = readFileSync(resolve(fontDir, file));
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== fontFiles[file]) throw new Error(`Font ${file} does not match its pinned SHA-256.`);
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) as OpenTypeFont;
  loaded.set(file, font);
  return font;
}

/**
 * Glyph outlines from a TrueType font, as an InkSource.
 * Coordinates are font units with y pointing down (baseline at 0), as opentype.js draws them.
 */
export function outlineSource(file: FontFile): InkSource {
  const font = load(file);
  const path = (c: string) => {
    const glyph = font.charToGlyph(c);
    if (glyph.index === 0) throw new Error(`${file} has no glyph for ${JSON.stringify(c)}`);
    return glyph.getPath(0, 0, font.unitsPerEm);
  };
  return {
    box: c => { const b = path(c).getBoundingBox(); return [b.x1, b.y1, b.x2, b.y2]; },
    body: c => `<path d="${path(c).toPathData(2)}"/>`,
  };
}
