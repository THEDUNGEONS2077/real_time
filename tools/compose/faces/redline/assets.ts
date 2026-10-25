/**
 * REDLINE asset layer: original vector-authored white masks.
 *
 * They are rasterized once at build time and tinted by the palette on the watch
 * (and in previews), so no reference pixels are redistributed and nothing blurs at runtime.
 */
import type { Palette } from '../../src/core/scene.ts';
import type { ImageData } from '../../src/svg/nodes.ts';

const svgDocument = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

/** Soft round glow placed at the four cardinal ticks. */
export const glowSvg = (): string =>
  svgDocument(24, 24, '<defs><radialGradient id="g"><stop stop-color="white" stop-opacity="0.55"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="12" fill="url(#g)"/>');

/** Static low-contrast grid and triangulation: one image instead of hundreds of fine primitives. */
export function meshSvg(): string {
  const grid = Array.from({ length: 19 }, (_, i) => `<path d="M${66 + i * 17} 75V365M65 ${75 + i * 16}H370"/>`).join('');
  const diagonals = Array.from({ length: 14 }, (_, i) => `<path d="M${55 + i * 23} 110L${75 + i * 18} 345M${60 + i * 20} 335L${100 + i * 18} 85"/>`).join('');
  const dots = Array.from({ length: 75 }, (_, i) => `<circle cx="${76 + i * 43 % 280}" cy="${85 + i * 67 % 273}" r="${i % 5 === 0 ? 0.8 : 0.45}" opacity="${i % 5 === 0 ? 0.9 : 0.5}"/>`).join('');
  const panels = '<path d="M154 66L214 111L154 124ZM278 66L218 111L278 124ZM112 272L154 306L112 348ZM320 272L278 306L320 348ZM176 286L216 307L256 286L216 266Z"/>';
  return svgDocument(432, 432, `<g fill="white" opacity="0.5">${panels}</g><g fill="none" stroke="white" stroke-width="0.5" opacity="0.4">${grid}</g><g fill="none" stroke="white" stroke-width="0.6" opacity="0.55">${diagonals}</g><g fill="white">${dots}</g>`);
}

/** Mask resources by name, with the role that tints each. */
export const masks = {
  redline_glow: { svg: glowSvg, role: 'accent' },
  redline_mesh: { svg: meshSvg, role: 'line' },
} as const;

/** Preview copies of the masks, tinted like WFF's tintColor (colour replaces white, alpha kept). */
export function maskImages(palette: Palette): ImageData {
  return Object.fromEntries(Object.entries(masks).map(([name, m]) =>
    [name, 'data:image/svg+xml;base64,' + Buffer.from(m.svg().replaceAll('white', palette[m.role])).toString('base64')]));
}
