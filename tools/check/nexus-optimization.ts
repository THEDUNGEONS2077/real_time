/**
 * NEXUS host-side optimization evidence. Compare authored 0.1.0 geometry with
 * packed resources at identical poses; count image work, never inferred FPS.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../compose/src/build.ts';
import { frame } from '../compose/src/core/frame.ts';
import { readsSource } from '../compose/src/core/expr.ts';
import type { Node } from '../compose/src/core/scene.ts';
import { selectNodes } from '../compose/src/core/scene.ts';
import { nodeSvg } from '../compose/src/svg/nodes.ts';
import { artwork } from '../compose/faces/nexus/artwork.ts';
import { effects, palettes, scene } from '../compose/faces/nexus/design.ts';
import type { PaletteId } from '../compose/faces/nexus/design.ts';

/** Structural counts of selected decoration; transparent pixels still occupy image rectangles. */
export function imageWork(nodes: Node[]): { images: number; imageRectanglePixels: number; opacityGroups: number; groups: number } {
  const result = { images: 0, imageRectanglePixels: 0, opacityGroups: 0, groups: 0 };
  const visit = (list: Node[]) => {
    for (const n of list) {
      if (n.kind === 'switch') throw new Error('Select settings before counting work.');
      if (n.kind === 'group') {
        result.groups++;
        if (readsSource(n.alpha)) result.opacityGroups++;
        visit(n.children);
      } else if (n.kind === 'image' || n.kind === 'sprite') {
        result.images++;
        result.imageRectanglePixels += (n.width ?? 432) * (n.height ?? 432);
      }
    }
  };
  visit(nodes);
  return result;
}

/** Compare actual raster layers across palettes, speeds, individual controls and wrap-adjacent times. */
export async function optimizationReport() {
  const compiled = await artwork();
  const defaults = Object.fromEntries(effects.map(e => [e, 'TRUE']));
  const configurations = [defaults, Object.fromEntries(effects.map(e => [e, 'FALSE'])),
    ...effects.map(e => ({ ...defaults, [e]: 'FALSE' }))];
  const samples: { palette: string; speed: string; configuration: number; seconds: number; meanChannelError: number; maxChannelError: number }[] = [];
  for (const id of Object.keys(palettes) as PaletteId[]) {
    const palette = palettes[id];
    for (const speed of ['STILL', 'SLOW', 'STANDARD', 'FAST'] as const) {
      const before = scene(speed), after = compiled.scenes[id][speed];
      const images = { ...await compiled.optimizer.previewImages(before, palette), ...await compiled.optimizer.previewImages(after, palette) };
      // Every palette and speed, all toggle-off interactions; extra poses exercise
      // fractional movement, opacity extrema and the daily reset for full motion.
      for (const [configuration, config] of configurations.entries()) {
        const times = configuration === 0 ? [0, 7.995, 16, 59.875, 86399.995] : [7.125];
        for (const seconds of times) {
          const f = frame({ config, time: new Date(Date.UTC(2026, 9, 29) + seconds * 1000) });
          const raster = (nodes: Node[]) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect width="432" height="432" fill="black"/>${nodes.map(n => nodeSvg(n, f, palette, images)).join('')}</svg>`))
            .removeAlpha().raw().toBuffer();
          const [a, b] = await Promise.all([raster(before), raster(after)]);
          let sum = 0, maximum = 0;
          for (let i = 0; i < a.length; i++) {
            const difference = Math.abs(a[i] - b[i]);
            sum += difference;
            maximum = Math.max(maximum, difference);
          }
          samples.push({ palette: id, speed, configuration, seconds,
            meanChannelError: sum / a.length, maxChannelError: maximum });
        }
      }
    }
  }
  const before = imageWork(selectNodes(scene('SLOW'), defaults));
  const after = imageWork(selectNodes(compiled.scenes.FUSION.SLOW, defaults));
  return {
    beforeVersion: '0.1.0', candidateVersion: '0.1.1', settings: 'FUSION / SLOW / all effects on',
    before, after,
    imageRectangleReduction: 1 - after.imageRectanglePixels / before.imageRectanglePixels,
    sampleCount: samples.length,
    maxMeanChannelError: Math.max(...samples.map(s => s.meanChannelError)),
    maxChannelError: Math.max(...samples.map(s => s.maxChannelError)),
    samples,
    note: 'Image rectangles are structural workload, not GPU timings or delivered FPS. Pixel comparisons use the same source masks, poses and controls; watch acceptance is pending.',
  };
}

/** Write reviewable evidence without connecting to the watch. */
export async function writeOptimizationReport(): Promise<void> {
  const report = await optimizationReport();
  const out = resolve(root, 'out/optimization/nexus');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'comparison.json'), JSON.stringify(report, null, 2) + '\n');
  const { samples, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.endsWith('nexus-optimization.ts')) await writeOptimizationReport();
