/** Asset layer: original 5x7 digits, drawn as square phosphor cells in both outputs. */
/** Each row is five cells; one is illuminated. */
export const digits = [
  ['01110','10001','10011','10101','11001','10001','01110'],
  ['00100','01100','00100','00100','00100','00100','01110'],
  ['01110','10001','00001','00010','00100','01000','11111'],
  ['11110','00001','00001','01110','00001','00001','11110'],
  ['00010','00110','01010','10010','11111','00010','00010'],
  ['11111','10000','10000','11110','00001','00001','11110'],
  ['01110','10000','10000','11110','10001','10001','01110'],
  ['11111','00001','00010','00100','01000','01000','01000'],
  ['01110','10001','10001','01110','10001','10001','01110'],
  ['01110','10001','10001','01111','00001','00001','01110'],
] as const;
/** Glyph metrics match BitmapFont Character widths and TimeText font size. */
export const glyph = { width: 44, height: 56, pitch: 8, cell: 4.5, inset: 3 } as const;
/** Build a white alpha mask. Palette tinting happens on the watch, not in extra image sets. */
export function digitSvg(digit: number, glow = true): string {
  const cells = digits[digit].flatMap((row,y) => [...row].flatMap((on,x) => on === '1' ?
    [`<rect x="${glyph.inset+x*glyph.pitch}" y="${glyph.inset+y*glyph.pitch}" width="${glyph.cell}" height="${glyph.cell}" rx="0.4"/>`] : [])).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56"><defs><filter id="glow" x="-40%" y="-30%" width="180%" height="160%"><feGaussianBlur stdDeviation="1.3"/></filter></defs><g fill="white">${glow?`<g opacity="0.42" filter="url(#glow)">${cells}</g>`:''}${cells}</g></svg>`;
}
/** Two padded rows, with no dependence on the host's locale or timezone. */
export function timeRows(time: Date, hour24: boolean): [string, string] {
  const hour = time.getUTCHours();
  return [String(hour24 ? hour : hour % 12 || 12).padStart(2,'0'), String(time.getUTCMinutes()).padStart(2,'0')];
}
