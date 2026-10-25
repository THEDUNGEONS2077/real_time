/**
 * REDLINE resource layer: every generated Android resource, as path → bytes.
 *
 * Nothing is written here; src/build.ts writes or checks the map. Output is
 * deterministic, and the committed resources are compared byte for byte.
 */
import sharp from 'sharp';
import { frame } from '../../src/core/frame.ts';
import { optionSvg } from '../../src/editor/icons.ts';
import { glyphResource, glyphSvg } from '../../src/fonts/glyphs.ts';
import type { GlyphFace, Glow } from '../../src/fonts/glyphs.ts';
import { masks } from './assets.ts';
import { editorSettings } from './editor.ts';
import { clockFace, fontIds, glows, readoutBlur, readoutFace } from './fonts.ts';
import { previewSvg } from './preview.ts';
import { clockFamily, compileWatchface, readoutFamily, stringsXml } from './render.ts';

/** Picker metadata shared by both faces' manifests. */
export const watchFaceInfo = '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated picker metadata. -->\n<WatchFaceInfo><Preview value="@drawable/preview"/><Editable value="true"/><MultipleInstancesAllowed value="true"/></WatchFaceInfo>\n';

/** Lossless, maximally compressed PNG from SVG. */
const png = (svg: string) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** Every glyph mask of one BitmapFont family. */
async function glyphMasks(family: string, face: GlyphFace, glow: Glow, blurScale = 1): Promise<[string, Buffer][]> {
  return Promise.all([...face.glyphs.values()].map(async g => [`drawable-nodpi/${glyphResource(family, g.char)}.png`, await png(glyphSvg(g, glow, blurScale))] as [string, Buffer]));
}

/** The complete resource tree for faces/redline/src/main/res. */
export async function redlineResources(): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  const compiled = compileWatchface();
  result.set('raw/watchface.xml', Buffer.from(compiled.xml));
  result.set('values/strings.xml', Buffer.from(stringsXml()));
  result.set('xml/watch_face_info.xml', Buffer.from(watchFaceInfo));
  for (const cache of compiled.caches) for (const [name, data] of await cache.resources()) result.set(name, data);
  for (const [name, mask] of Object.entries(masks)) {
    result.set(`drawable-nodpi/${name}.webp`, await sharp(Buffer.from(mask.svg())).webp({ lossless: true, effort: 6 }).toBuffer());
  }
  for (const s of editorSettings) for (const o of s.options) result.set(`drawable-nodpi/${o.icon}.png`, await png(optionSvg(o)));
  // Clock glyphs for every font and glow level; readout glyphs (always LOW glow) where a font has them.
  for (const font of fontIds) {
    for (const glow of glows) for (const [name, data] of await glyphMasks(clockFamily(font, glow), clockFace(font), glow)) result.set(name, data);
    const readout = readoutFace(font);
    if (readout) for (const [name, data] of await glyphMasks(readoutFamily(font), readout, 'LOW', readoutBlur)) result.set(name, data);
  }
  result.set('drawable-nodpi/preview.png', await png(previewSvg(frame())));
  return result;
}
