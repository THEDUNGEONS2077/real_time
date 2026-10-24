/** Pure geometry layer: angles start at twelve and increase clockwise, as in WFF. */

/** Return a point on a watch-centred circle. */
export function polar(radius: number, degrees: number, cx = 216, cy = 216): [number, number] {
  const radians = degrees * Math.PI / 180;
  return [cx + radius * Math.sin(radians), cy - radius * Math.cos(radians)];
}
/** Clamp external sample values before using them in a visual. */
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
/** SVG path for a clockwise WFF arc, including complete circles. */
export function arcPath(r: number, start: number, end: number, cx = 216, cy = 216): string {
  if (end <= start) return '';
  if (end - start >= 359.999) return `${arcPath(r,start,start+180,cx,cy)} ${arcPath(r,start+180,start+360,cx,cy)}`;
  const [x1,y1] = polar(r,start,cx,cy), [x2,y2] = polar(r,end,cx,cy);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${end-start>180?1:0} 1 ${x2} ${y2}`;
}
