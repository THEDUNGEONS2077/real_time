/** Packing contracts: preserve weak glow, transparent space, pivots and painter order. */
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { cropRaster, RasterOptimizer } from '../src/raster.ts';
import { daySeconds } from '../src/core/expr.ts';
import { nodeXml } from '../src/wff/nodes.ts';
import { palettes } from '../faces/nexus/design.ts';
import { artwork } from '../faces/nexus/artwork.ts';
import { optimizationReport } from '../../check/nexus-optimization.ts';

it('keeps even one-alpha glow pixels and one filtering pixel around the crop', async () => {
  const pixels = Buffer.alloc(20 * 20 * 4);
  pixels[(7 * 20 + 6) * 4 + 3] = 1;
  pixels[(10 * 20 + 12) * 4 + 3] = 255;
  const png = await sharp(pixels, { raw: { width: 20, height: 20, channels: 4 } }).png().toBuffer();
  const crop = await cropRaster(png);
  expect([crop.x, crop.y, crop.width, crop.height]).toEqual([5, 6, 9, 6]);
  const restored = await sharp({ create: { width: 20, height: 20, channels: 4, background: '#00000000' } })
    .composite([{ input: crop.png, left: crop.x, top: crop.y }]).raw().toBuffer();
  expect(restored).toEqual(pixels);
});

it('keeps an external rotation pivot in a parent group', async () => {
  const optimizer = await RasterOptimizer.create({ dot: '<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect x="212" y="10" width="8" height="8" fill="white"/></svg>' });
  const [node] = await optimizer.scene([{ kind: 'group', name: 'orbit', angle: daySeconds,
    children: [{ kind: 'image', resource: 'dot', role: 'ink', alpha: 255 }] }], palettes.FUSION);
  expect(node.kind).toBe('group');
  if (node.kind !== 'group' || node.children[0].kind !== 'image') throw new Error('Orbit group missing.');
  expect(node.children[0].width).toBe(10);
  expect(nodeXml(node, palettes.FUSION)).toContain('pivotX="0.5" pivotY="0.5"');
});

it('puts all single-image opacity directly on tightly bounded images', async () => {
  const compiled = await artwork();
  const xml = compiled.scenes.FUSION.SLOW.map(n => nodeXml(n, palettes.FUSION)).join('');
  for (const name of ['glass_glow', 'packet_0', 'packet_1']) {
    expect(xml).toContain(`<PartImage name="${name}"`);
    expect(xml).not.toContain(`<Group x="0" y="0" width="432" height="432" name="${name}"`);
  }
  expect(xml).toContain('target="y" value="(168+');
});

it('preserves the complete design while reducing default image work', async () => {
  const report = await optimizationReport();
  expect(report.sampleCount).toBe(384);
  expect(report.after.images).toBeLessThan(report.before.images);
  expect(report.imageRectangleReduction).toBeGreaterThan(0.6);
  expect(report.after.opacityGroups).toBe(0);
  // Minor 8-bit compositing/antialias rounding is expected; a shifted/missing
  // element produces much larger error, especially in the bright palettes.
  expect(report.maxMeanChannelError).toBeLessThan(0.1);
  expect(report.maxChannelError).toBeLessThanOrEqual(4);
}, 60000);
