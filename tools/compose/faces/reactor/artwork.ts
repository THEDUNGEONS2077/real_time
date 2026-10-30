/** REACTOR packing layer: opt into shared raster optimization without altering the design. */
import type { Node } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';
import { RasterOptimizer } from '../../src/raster.ts';
import { palettes, scene } from './design.ts';
import type { PaletteId, Speed } from './design.ts';
import { maskSvgs } from './masks.ts';

/** The same compiled scenes feed the WFF output, resource packaging and SVG gallery. */
export interface ReactorArtwork {
  optimizer: RasterOptimizer;
  scenes: Record<PaletteId, Record<Speed, Node[]>>;
}

/** Construct all palette/speed combinations once and deduplicate their shared masks. */
async function compileArtwork(): Promise<ReactorArtwork> {
  const optimizer = await RasterOptimizer.create(maskSvgs());
  const scenes = {} as ReactorArtwork['scenes'];
  for (const id of Object.keys(palettes) as PaletteId[]) {
    const versions = {} as Record<Speed, Node[]>;
    for (const speed of ['SLOW', 'STANDARD', 'FAST'] as const) {
      versions[speed] = await optimizer.scene(scene(speed), palettes[id]);
    }
    versions.STILL = stillNodes(versions.STANDARD);
    scenes[id] = versions;
  }
  return { optimizer, scenes };
}

let compiled: Promise<ReactorArtwork> | undefined;

/** Memoized build data; this cache exists only on the build PC, never in the APK. */
export function artwork(): Promise<ReactorArtwork> {
  return compiled ??= compileArtwork();
}
