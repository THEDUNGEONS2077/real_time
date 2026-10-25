/**
 * Build-time layer cache.
 *
 * Long runs of static primitives are flattened into one cropped, lossless
 * WebP each. That gives the watch fewer parts to draw per frame. Painter order is
 * kept, and moving groups keep their live transforms: only their artwork is
 * cached. The vector source stays authoritative; the SVG backend produces the
 * pixels, so cached and direct rendering match.
 */
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { frame } from './core/frame.ts';
import { isConstant } from './core/expr.ts';
import type { Node, Palette } from './core/scene.ts';
import { isShape } from './core/scene.ts';
import type { ImageData } from './svg/nodes.ts';
import { nodeSvg } from './svg/nodes.ts';

/** One cached layer: its resource name, SVG source and canvas placement. */
export interface BakedLayer { resource: string; svg: string; x: number; y: number; width: number; height: number; primitives: number }

/** Runs shorter than this stay as vectors; caching tiny runs would only add image memory. */
const minimumRun = 8;

/** Caches layers for one palette. Identical layers share one resource across palettes. */
export class LayerCache {
  readonly layers = new Map<string, BakedLayer>();
  readonly palette: Palette;
  readonly images: ImageData;
  constructor(palette: Palette, images: ImageData) { this.palette = palette; this.images = images; }

  /** Replace static runs with cached images, recursing into switches and groups. */
  scene(nodes: Node[]): Node[] {
    const result: Node[] = [];
    let pending: Node[] = [];
    const flush = () => {
      result.push(...(pending.length >= minimumRun ? [this.layer(pending)] : pending));
      pending = [];
    };
    for (const node of nodes) {
      if (this.isStatic(node)) { pending.push(node); continue; }
      flush();
      if (node.kind === 'switch') result.push({ ...node, on: this.scene(node.on), off: this.scene(node.off) });
      else if (node.kind === 'group') result.push({ ...node, children: this.scene(node.children) });
      else result.push(node);
    }
    flush();
    return result;
  }

  /** Static means a tinted image or a primitive whose every property is constant. */
  private isStatic(n: Node): boolean {
    if (n.kind === 'image') return n.tint !== false;
    return isShape(n) && (n.alpha === undefined || isConstant(n.alpha));
  }

  /** Rasterize a run into one cropped layer and return the image node that replaces it. */
  private layer(nodes: Node[]): Node {
    // Bounds include half the stroke plus one antialiasing pixel. Arcs use their full circle (a safe overestimate).
    const boxes = nodes.map(n => {
      if (!isShape(n) && n.kind !== 'image') throw new Error('Only static geometry can be cached.');
      const pad = (isShape(n) ? (n.stroke ?? 0) / 2 : 0) + 1;
      const x = n.x ?? 0, y = n.y ?? 0;
      let box: number[];
      if (n.kind === 'arc') box = [(n.cx ?? 216) - n.r!, (n.cy ?? 216) - n.r!, (n.cx ?? 216) + n.r!, (n.cy ?? 216) + n.r!];
      else if (n.kind === 'circle') box = [x - n.r!, y - n.r!, x + n.r!, y + n.r!];
      else if (n.kind === 'line') box = [Math.min(x, n.x2!), Math.min(y, n.y2!), Math.max(x, n.x2!), Math.max(y, n.y2!)];
      else box = [x, y, x + (n.width ?? 432), y + (n.height ?? 432)];
      return [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
    });
    const x = Math.max(0, Math.floor(Math.min(...boxes.map(b => b[0]))));
    const y = Math.max(0, Math.floor(Math.min(...boxes.map(b => b[1]))));
    const width = Math.min(432, Math.ceil(Math.max(...boxes.map(b => b[2])))) - x;
    const height = Math.min(432, Math.ceil(Math.max(...boxes.map(b => b[3])))) - y;
    const body = nodes.map(n => nodeSvg(n, frame(), this.palette, this.images)).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${body}</svg>`;
    // Content-addressed name: colour is part of the SVG, so identical neutral layers dedupe across palettes.
    const resource = `cached_layer_${createHash('sha256').update(svg).digest('hex').slice(0, 16)}`;
    this.layers.set(resource, { resource, svg, x, y, width, height, primitives: nodes.length });
    return { kind: 'image', resource, x, y, width, height, alpha: 255, role: 'ink', tint: false };
  }

  /** Encode every layer once, on the PC. No blur or recolouring runs on the watch. */
  async resources(): Promise<Map<string, Buffer>> {
    const encoded = await Promise.all([...this.layers.values()].map(async l =>
      [`drawable-nodpi/${l.resource}.webp`, await sharp(Buffer.from(l.svg)).webp({ lossless: true, effort: 6 }).toBuffer()] as const));
    return new Map(encoded);
  }

  /** Preview data for every cached layer, so SVG can render the optimized tree too. */
  async previewImages(): Promise<ImageData> {
    const entries = await Promise.all([...this.layers.values()].map(async l =>
      [l.resource, 'data:image/png;base64,' + (await sharp(Buffer.from(l.svg)).png().toBuffer()).toString('base64')] as const));
    return Object.fromEntries(entries);
  }
}
