/** Font layer: declare a laid-out face as a WFF BitmapFont. */
import type { GlyphFace } from './glyphs.ts';
import { glyphResource } from './glyphs.ts';
import { tag } from '../wff/xml.ts';

/**
 * A BitmapFont whose characters point at `<name>_<char>` masks.
 * Lowercase letters reuse the capital masks, so provider casing never matters.
 */
export function bitmapFontXml(name: string, face: GlyphFace): string {
  const characters = [...face.glyphs.values()].flatMap(g => {
    const resource = glyphResource(name, g.char);
    const entry = (c: string) => tag('Character', { name: c, resource, width: g.width, height: g.height });
    return /[A-Z]/.test(g.char) ? [entry(g.char), entry(g.char.toLowerCase())] : [entry(g.char)];
  });
  return tag('BitmapFont', { name }, characters.join(''));
}
