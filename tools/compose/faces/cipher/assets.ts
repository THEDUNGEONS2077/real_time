/**
 * CIPHER asset layer: every moving or static artwork piece as one white mask image.
 *
 * Each ring, rain column and sweep is drawn once here and rasterized at build time.
 * On the watch it is a single tinted PartImage whose group rotates or falls, so a whole
 * ring of 70 glyphs costs one draw. Glyphs come from Share Tech Mono (OFL), using the
 * matrix-rain set from cyberdeck_terminal; about a third are mirrored, as in the film.
 */
import { polar, arcPath } from '../../src/core/geometry.ts';
import { outlineSource } from '../../src/fonts/outline.ts';

/** Matrix glyphs (cyberdeck_terminal's base set, minus characters the font lacks). */
export const rainGlyphs = '0123456789ZTHEMXAKR:=*+<>';

/** Deterministic xorshift32, so every build draws the same rings. */
export function random(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const font = outlineSource('share-tech-mono/ShareTechMono-Regular.ttf');
/** Height of the digit '0' in font units; glyph sizes are given as this cap height. */
const [, capTop, , capBottom] = font.box('0');
const capHeight = capBottom - capTop;

/**
 * One glyph, centred on (x, y), rotated by `angle` degrees, `size` units tall.
 * Mirrored glyphs are flipped horizontally.
 */
function glyph(c: string, x: number, y: number, angle: number, size: number, mirrored: boolean, alpha: number): string {
  const [x1, y1, x2, y2] = font.box(c);
  const s = size / capHeight;
  const transform = `translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${(mirrored ? -s : s).toFixed(5)},${s.toFixed(5)}) translate(${(-(x1 + x2) / 2).toFixed(1)},${(-(y1 + y2) / 2).toFixed(1)})`;
  return `<g transform="${transform}" opacity="${alpha.toFixed(2)}">${font.body(c)}</g>`;
}

const doc = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><g fill="white">${body}</g></svg>`;

/**
 * A ring of glyphs standing on a circle, tops pointing outward, with random brightness.
 * Gaps (skipped slots) break the ring into "words" so its rotation reads clearly.
 */
export function codeRingSvg(radius: number, count: number, size: number, seed: number): string {
  const next = random(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    if (next() < 0.14) continue;
    const angle = (i * 360) / count;
    const [x, y] = polar(radius, angle);
    const c = rainGlyphs[Math.floor(next() * rainGlyphs.length)];
    // A few bright "heads", most glyphs mid-bright, some faint.
    const roll = next();
    const alpha = roll < 0.1 ? 1 : roll < 0.7 ? 0.45 + next() * 0.3 : 0.18 + next() * 0.15;
    parts.push(glyph(c, x, y, angle, size, next() < 0.35, alpha));
  }
  return doc(parts.join(''));
}

/** Size of one rain column image. */
export const rainColumn = { width: 16, glyph: 12, count: 14, pitch: 15 } as const;
export const rainHeight = rainColumn.count * rainColumn.pitch;

/** A falling column: faint tail at the top, bright head at the bottom. */
export function rainSvg(seed: number): string {
  const next = random(seed);
  const parts: string[] = [];
  for (let i = 0; i < rainColumn.count; i++) {
    const t = (i + 1) / rainColumn.count;
    const alpha = i === rainColumn.count - 1 ? 1 : 0.08 + 0.62 * t * t;
    const c = rainGlyphs[Math.floor(next() * rainGlyphs.length)];
    parts.push(glyph(c, rainColumn.width / 2, i * rainColumn.pitch + rainColumn.pitch / 2, 0, rainColumn.glyph, next() < 0.35, alpha));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rainColumn.width}" height="${rainHeight}" viewBox="0 0 ${rainColumn.width} ${rainHeight}"><g fill="white">${parts.join('')}</g></svg>`;
}

/** The arc ring's quiet track: a hairline circle and short dashes every 6°. */
export function arcTrackSvg(): string {
  const dashes = Array.from({ length: 60 }, (_, i) => `<path d="${arcPath(166, i * 6, i * 6 + 2)}" stroke-width="3" opacity="0.7"/>`).join('');
  return doc(`<g fill="none" stroke="white"><circle cx="216" cy="216" r="172" stroke-width="0.8" opacity="0.8"/>${dashes}</g>`);
}

/** The arc ring's bright segments: three arcs of different lengths, plus end caps. */
export function arcSegmentsSvg(): string {
  const arcs = [[10, 70], [150, 190], [255, 280]].map(([a, b]) =>
    `<path d="${arcPath(172, a, b)}" stroke-width="3.2"/><path d="${arcPath(172, a, b)}" stroke-width="9" opacity="0.12"/>`
    + [a, b].map(end => { const [x1, y1] = polar(164, end), [x2, y2] = polar(180, end); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="1.4"/>`; }).join('')).join('');
  return doc(`<g fill="none" stroke="white">${arcs}</g>`);
}

/** A comet on the outer track: a bright head with a 70° fading tail behind it (clockwise motion). */
export function sweepSvg(): string {
  const tail = Array.from({ length: 70 }, (_, i) => {
    const alpha = Math.pow(1 - i / 70, 2.2);
    return `<path d="${arcPath(196, 360 - i - 1.2, 360 - i)}" opacity="${alpha.toFixed(3)}"/>`;
  }).join('');
  const head = `<path d="${arcPath(196, 358.8, 360)}" stroke-width="4.5"/><path d="${arcPath(196, 357, 360)}" stroke-width="10" opacity="0.2"/>`;
  return doc(`<g fill="none" stroke="white" stroke-width="3" stroke-linecap="butt">${tail}${head}</g>`);
}

/** Static bezel: a fine minute track with longer marks every five minutes. */
export function bezelSvg(): string {
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const [x1, y1] = polar(major ? 199 : 203, i * 6), [x2, y2] = polar(208, i * 6);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${major ? 1.6 : 0.8}" opacity="${major ? 1 : 0.6}"/>`;
  }).join('');
  return doc(`<g fill="none" stroke="white"><circle cx="216" cy="216" r="209" stroke-width="0.8" opacity="0.7"/>${ticks}</g>`);
}

/** The seconds marker: a small solid block on the minute track, at twelve (it rotates). */
export function secondsSvg(): string {
  return doc('<rect x="213.5" y="7" width="5" height="9" rx="0.6"/>');
}

/** Corner brackets framing the complication slot. */
export function slotFrameSvg(x: number, y: number, width: number, height: number): string {
  const corners: [number, number, number, number][] = [[x, y, 1, 1], [x + width, y, -1, 1], [x, y + height, 1, -1], [x + width, y + height, -1, -1]];
  const paths = corners.map(([cx, cy, sx, sy]) => `<path d="M${cx + sx * 9} ${cy}H${cx}V${cy + sy * 9}"/>`).join('');
  return doc(`<g fill="none" stroke="white" stroke-width="1">${paths}</g>`);
}
