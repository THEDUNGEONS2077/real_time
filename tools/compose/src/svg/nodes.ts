/**
 * SVG layer: render the same scene nodes for local previews and tests.
 *
 * Previews approximate the system renderer; they are never presented as a
 * screenshot from the watch. Geometry starts at twelve and runs clockwise, as WFF.
 */
import type { Frame } from '../core/frame.ts';
import { value } from '../core/expr.ts';
import { arcPath } from '../core/geometry.ts';
import type { Node, Palette, Shape } from '../core/scene.ts';
import { isShape } from '../core/scene.ts';

/** Image data URIs, keyed by resource name or resource:literal-colour for shared masks. */
export type ImageData = Record<string, string>;

/** One primitive with its paint and live opacity. */
function shapeSvg(n: Shape, f: Frame, palette: Palette): string {
  const colour = palette[n.role];
  const paint = `opacity="${value(n.alpha ?? 255, f) / 255}" ${n.stroke ? `stroke="${colour}" stroke-width="${n.stroke}" fill="none"` : `fill="${colour}"`}`;
  const x = n.x ?? 0, y = n.y ?? 0;
  switch (n.kind) {
    case 'line': return `<line x1="${x}" y1="${y}" x2="${n.x2}" y2="${n.y2}" ${paint}/>`;
    case 'rect': return `<rect x="${x}" y="${y}" width="${n.width}" height="${n.height}" ${paint}/>`;
    case 'circle': return `<circle cx="${x}" cy="${y}" r="${n.r}" ${paint}/>`;
    case 'arc': return `<path d="${arcPath(n.r ?? 0, n.start ?? 0, n.end ?? 360, n.cx ?? 216, n.cy ?? 216)}" ${paint}/>`;
  }
}

/** Render one node for a frame. Switches follow the frame's editor choices. */
export function nodeSvg(n: Node, f: Frame, palette: Palette, images: ImageData): string {
  if (isShape(n)) return shapeSvg(n, f, palette);
  switch (n.kind) {
    case 'sprite': {
      const href = (n.tint === false ? undefined : images[`${n.resource}:${palette[n.role]}`]) ?? images[n.resource];
      if (!href) throw new Error(`No preview image for ${n.resource}`);
      const cx = n.x + n.width * n.pivotX;
      const cy = n.y + n.height * n.pivotY;
      const move = `translate(${value(n.offsetX ?? 0, f)},${value(n.offsetY ?? 0, f)}) rotate(${value(n.angle ?? 0, f)} ${cx} ${cy})`;
      return `<g transform="${move}"><image x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" opacity="${value(n.alpha, f) / 255}" href="${href}"/></g>`;
    }
    case 'switch': {
      const branch = f.config[n.setting] === 'FALSE' ? n.off : n.on;
      return branch.map(c => nodeSvg(c, f, palette, images)).join('');
    }
    case 'group': {
      // Previews show the ideal steady-state pose; Smooth's interpolation converges on it.
      const move = `translate(${value(n.x ?? 0, f)},${value(n.y ?? 0, f)}) rotate(${value(n.angle ?? 0, f)} 216 216)`;
      const body = n.children.map(c => nodeSvg(c, f, palette, images)).join('');
      return `<g transform="${move}" opacity="${value(n.alpha ?? 255, f) / 255}">${body}</g>`;
    }
    case 'image': {
      const href = (n.tint === false ? undefined : images[`${n.resource}:${palette[n.role]}`]) ?? images[n.resource];
      if (!href) throw new Error(`No preview image for ${n.resource}`);
      return `<image x="${n.x ?? 0}" y="${n.y ?? 0}" width="${n.width ?? 432}" height="${n.height ?? 432}" opacity="${n.alpha / 255}" href="${href}"/>`;
    }
  }
}
