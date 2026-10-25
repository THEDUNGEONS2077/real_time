/** Font layer: draw text from glyph masks for SVG previews, exactly as a BitmapFont lays it out. */
import type { Glow, GlyphFace } from './glyphs.ts';
import { glyphOf, glyphSvg, textWidth } from './glyphs.ts';

/** Draw a string of glyph masks centred on `cx`, with its cells' top at `y`, tinted `colour`. */
export function glyphRun(face: GlyphFace, text: string, cx: number, y: number, scale: number, colour: string, glow: Glow, alpha = 1, blurScale = 1): string {
  let x = cx - (textWidth(face, text) * scale) / 2;
  return [...text].map(c => {
    const g = glyphOf(face, c);
    const svg = glyphSvg(g, glow, blurScale).replace('fill="white"', `fill="${colour}"`);
    const image = `<image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(g.width * scale).toFixed(2)}" height="${(g.height * scale).toFixed(2)}" opacity="${alpha}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`;
    x += g.width * scale;
    return image;
  }).join('');
}
