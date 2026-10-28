/**
 * NEXUS resource layer: every generated Android resource, as path → bytes.
 * Deterministic; the committed resources are compared byte for byte.
 */
import sharp from 'sharp';
import { frame } from '../../src/core/frame.ts';
import { optionSvg } from '../../src/editor/icons.ts';
import { clockFace, glows, readoutBlur, readoutFace } from '../../src/fonts/catalog.ts';
import { glyphResource, glyphSvg } from '../../src/fonts/glyphs.ts';
import type { GlyphFace, Glow } from '../../src/fonts/glyphs.ts';
import { maskSvgs } from './masks.ts';
import { nexusFonts, editorSettings } from './editor.ts';
import { previewSvg } from './preview.ts';
import { clockFamily, compileWatchface, readoutFamily, stringsXml } from './render.ts';

const png = (svg: string) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** Every glyph mask of one BitmapFont family. */
async function glyphMasks(family: string, face: GlyphFace, glow: Glow, blurScale = 1): Promise<[string, Buffer][]> {
  return Promise.all([...face.glyphs.values()].map(async g => [`drawable-nodpi/${glyphResource(family, g.char)}.png`, await png(glyphSvg(g, glow, blurScale))] as [string, Buffer]));
}

/** The complete resource tree for faces/nexus/src/main/res. */
export async function nexusResources(): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  result.set('raw/watchface.xml', Buffer.from(compileWatchface()));
  result.set('values/strings.xml', Buffer.from(stringsXml()));
  result.set('xml/watch_face_info.xml', Buffer.from('<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated picker metadata. -->\n<WatchFaceInfo><Preview value="@drawable/preview"/><Editable value="true"/><MultipleInstancesAllowed value="true"/></WatchFaceInfo>\n'));
  // Masks are lossless WebP: smaller than PNG for large, mostly transparent rings.
  for (const [name, svg] of Object.entries(maskSvgs())) result.set(`drawable-nodpi/${name}.webp`, await sharp(Buffer.from(svg)).webp({ lossless: true, effort: 6 }).toBuffer());
  for (const s of editorSettings) for (const o of s.options) result.set(`drawable-nodpi/${o.icon}.png`, await png(optionSvg(o)));
  for (const font of nexusFonts) {
    for (const glow of glows) for (const [name, data] of await glyphMasks(clockFamily(font, glow), clockFace(font), glow)) result.set(name, data);
    for (const [name, data] of await glyphMasks(readoutFamily(font), readoutFace(font)!, 'LOW', readoutBlur)) result.set(name, data);
  }
  result.set('drawable-nodpi/preview.png', await png(previewSvg(frame({ time: new Date('2026-10-28T10:45:00Z') }))));
  return result;
}
