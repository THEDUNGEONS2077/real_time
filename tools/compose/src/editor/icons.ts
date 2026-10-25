/**
 * Editor layer: 96×96 option icons.
 *
 * Each tile is a dark HUD disc with the option's colour, plus a caption in the
 * original 5×7 alphabet. Options may supply their own `art` (for example "12"
 * drawn in a clock font); otherwise a small arc motif is drawn.
 */
import type { EditorOption } from './catalogue.ts';
import { litCells } from './letters.ts';

/** Caption cells, centred horizontally at the given baseline row. */
function caption(text: string, top: number, maxWidth: number): string {
  const columns = text.length * 6 - 1;
  const cell = Math.min(2.4, maxWidth / columns);
  const left = (96 - columns * cell) / 2;
  return [...text].flatMap((c, i) => (c === ' ' ? [] : litCells(c).map(([x, y]) =>
    `<rect x="${left + (i * 6 + x) * cell}" y="${top + y * cell}" width="${cell * 0.85}" height="${cell * 0.85}"/>`))).join('');
}

/** The complete SVG for one option tile. */
export function optionSvg(option: EditorOption): string {
  const motif = option.art ?? `<path d="M20 36A30 30 0 0 1 76 36" fill="none" stroke="${option.colour}" stroke-width="5"/><path d="M48 14V22M18 46H25M71 46H78" stroke="#edf0f1" stroke-width="2"/>`;
  // Font tiles put the caption lower so the sample digits get the upper half.
  const top = option.art ? 64 : 49;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">`
    + `<circle cx="48" cy="48" r="44" fill="#070a10" stroke="${option.colour}" stroke-width="3"/>`
    + motif
    + `<g fill="#edf0f1">${caption(option.caption, top, 72)}</g>`
    + `<path d="M32 ${option.art ? 84 : 76}H64" stroke="${option.colour}" stroke-width="3"/></svg>`;
}
