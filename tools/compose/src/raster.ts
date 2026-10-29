/**
 * Opt-in build-time image optimization. Crop transparent borders, merge adjacent
 * static images in painter order, and put single-image motion on PartImage itself.
 * It never changes clocks, editor choices, animation equations or source artwork.
 */
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { op } from './core/expr.ts';
import type { Group, ImageNode, Node, Palette, Sprite } from './core/scene.ts';
import type { ImageData } from './svg/nodes.ts';

/** Pixel-exact cropped image and its offset in the original source. */
export interface Raster {
  png: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Find every nonzero-alpha pixel; keep one transparent pixel for filtering. */
export async function cropRaster(png: Buffer): Promise<Raster> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x1 = info.width, y1 = info.height, x2 = -1, y2 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue;
    x1 = Math.min(x1, x); y1 = Math.min(y1, y);
    x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  }
  if (x2 < 0) return { png: await sharp({ create: { width: 1, height: 1, channels: 4, background: '#00000000' } }).png().toBuffer(), x: 0, y: 0, width: 1, height: 1 };
  const x = Math.max(0, x1 - 1), y = Math.max(0, y1 - 1);
  const width = Math.min(info.width, x2 + 2) - x;
  const height = Math.min(info.height, y2 + 2) - y;
  return { png: await sharp(png).extract({ left: x, top: y, width, height }).png().toBuffer(), x, y, width, height };
}

/** Apply WFF's literal RGB tint while preserving the mask's alpha exactly. */
async function tint(png: Buffer, colour: string, alpha = 255): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = colour.slice(1).match(/../g)!.map(c => parseInt(c, 16));
  if (rgb.length !== 3) throw new Error('Raster masks require a literal RGB palette colour.');
  for (let p = 0; p < data.length; p += 4) {
    data[p] = rgb[0]; data[p + 1] = rgb[1]; data[p + 2] = rgb[2];
    data[p + 3] = Math.round(data[p + 3] * alpha / 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Lift motion only when a cropped image can retain the original rotation pivot. */
function directImage(group: Group): Node {
  if (group.children.length !== 1 || group.children[0].kind !== 'image'
    || group.gyro || group.angleTransition || group.alphaTransition) return group;
  const image = group.children[0];
  const x = image.x ?? 0, y = image.y ?? 0;
  const width = image.width ?? 432, height = image.height ?? 432;
  const pivotX = group.angle === undefined ? 0.5 : (216 - x) / width;
  const pivotY = group.angle === undefined ? 0.5 : (216 - y) / height;
  // WFF pivots are constrained to [0,1]. Small orbiting marks keep their parent
  // rotation; inventing an external pivot would change their path on the watch.
  if (pivotX < 0 || pivotX > 1 || pivotY < 0 || pivotY > 1) return group;
  const alpha = group.alpha ?? 255;
  const result: Sprite = {
    ...image, kind: 'sprite', name: group.name, x, y, width, height,
    pivotX, pivotY, angle: group.angle, offsetX: group.x, offsetY: group.y,
    alpha: image.alpha === 255 ? alpha : op('*', alpha, image.alpha / 255),
  };
  return result;
}

/** Shared image optimizer; use one instance to deduplicate a face's palettes. */
export class RasterOptimizer {
  readonly packed = new Map<string, Raster>();
  private readonly sources = new Map<string, Buffer>();
  private readonly cropped = new Map<string, Promise<Raster>>();
  private readonly previewCache = new Map<string, Promise<string>>();

  /** Rasterize authored SVGs once, before touching the scene graph. */
  static async create(sources: Record<string, string>): Promise<RasterOptimizer> {
    const optimizer = new RasterOptimizer();
    for (const [name, svg] of Object.entries(sources)) {
      optimizer.sources.set(name, await sharp(Buffer.from(svg)).png().toBuffer());
    }
    return optimizer;
  }

  /** Content addresses deduplicate unchanged white masks across every palette. */
  private register(raster: Raster): string {
    const name = `cached_raster_${createHash('sha256').update(raster.png).digest('hex').slice(0, 16)}`;
    this.packed.set(name, raster);
    return name;
  }

  /** Crop a source without resampling; reject scaling rather than silently changing geometry. */
  private async image(node: ImageNode): Promise<ImageNode> {
    const png = this.sources.get(node.resource);
    if (!png) throw new Error(`Missing source mask ${node.resource}`);
    const metadata = await sharp(png).metadata();
    if ((node.width ?? 432) !== metadata.width || (node.height ?? 432) !== metadata.height) {
      throw new Error('Raster optimization requires image coordinates at source resolution.');
    }
    if (!this.cropped.has(node.resource)) this.cropped.set(node.resource, cropRaster(png));
    const cropped = await this.cropped.get(node.resource)!;
    return { ...node, resource: this.register(cropped), x: (node.x ?? 0) + cropped.x,
      y: (node.y ?? 0) + cropped.y, width: cropped.width, height: cropped.height };
  }

  /** Composite a consecutive static run; switches and moving nodes remain barriers. */
  private async merge(nodes: ImageNode[], palette: Palette): Promise<ImageNode> {
    const x = Math.min(...nodes.map(n => n.x!)), y = Math.min(...nodes.map(n => n.y!));
    const width = Math.max(...nodes.map(n => n.x! + n.width!)) - x;
    const height = Math.max(...nodes.map(n => n.y! + n.height!)) - y;
    const inputs = await Promise.all(nodes.map(async n => ({
      input: await tint(this.packed.get(n.resource)!.png, palette[n.role], n.alpha),
      left: n.x! - x, top: n.y! - y,
    })));
    const png = await sharp({ create: { width, height, channels: 4, background: '#00000000' } })
      .composite(inputs).png().toBuffer();
    const raster = await cropRaster(png);
    return { kind: 'image', resource: this.register(raster), x: x + raster.x, y: y + raster.y,
      width: raster.width, height: raster.height, role: 'ink', alpha: 255, tint: false };
  }

  /** Preserve painter order and optional branches while reducing actual image work. */
  async scene(nodes: Node[], palette: Palette): Promise<Node[]> {
    const result: Node[] = [];
    let run: ImageNode[] = [];
    const flush = async () => {
      if (run.length > 1) result.push(await this.merge(run, palette));
      else result.push(...run);
      run = [];
    };
    for (const node of nodes) {
      if (node.kind === 'image' && node.tint !== false) {
        run.push(await this.image(node));
        continue;
      }
      await flush();
      if (node.kind === 'switch') {
        result.push({ ...node, on: await this.scene(node.on, palette), off: await this.scene(node.off, palette) });
      } else if (node.kind === 'group') {
        result.push(directImage({ ...node, children: await this.scene(node.children, palette) }));
      } else result.push(node);
    }
    await flush();
    return result;
  }

  /** Preview actual packed pixels (or original source pixels), with per-instance tint. */
  async previewImages(nodes: Node[], palette: Palette): Promise<ImageData> {
    const images: ImageData = {};
    for (const node of nodes) {
      if (node.kind === 'switch') Object.assign(images, await this.previewImages([...node.on, ...node.off], palette));
      else if (node.kind === 'group') Object.assign(images, await this.previewImages(node.children, palette));
      else if (node.kind === 'image' || node.kind === 'sprite') {
        const key = node.tint === false ? node.resource : `${node.resource}:${palette[node.role]}`;
        if (!this.previewCache.has(key)) {
          const png = this.packed.get(node.resource)?.png ?? this.sources.get(node.resource);
          if (!png) throw new Error(`Missing raster ${node.resource}`);
          this.previewCache.set(key, (async () => {
            const data = node.tint === false ? png : await tint(png, palette[node.role]);
            return 'data:image/png;base64,' + data.toString('base64');
          })());
        }
        images[key] = await this.previewCache.get(key)!;
      }
    }
    return images;
  }

  /** Encode only resources reachable from the final scenes, excluding intermediate masks. */
  async resources(scenes: Node[][]): Promise<Map<string, Buffer>> {
    const referenced = new Set<string>();
    const visit = (nodes: Node[]) => {
      for (const n of nodes) {
        if (n.kind === 'group') visit(n.children);
        else if (n.kind === 'switch') { visit(n.on); visit(n.off); }
        else if (n.kind === 'image' || n.kind === 'sprite') referenced.add(n.resource);
      }
    };
    scenes.forEach(visit);
    const result = new Map<string, Buffer>();
    for (const name of referenced) {
      result.set(`drawable-nodpi/${name}.webp`, await sharp(this.packed.get(name)!.png).webp({ lossless: true, effort: 6 }).toBuffer());
    }
    return result;
  }
}
