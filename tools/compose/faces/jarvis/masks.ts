/**
 * JARVIS artwork: concentric instruments reauthored as small white-alpha masks.
 * The reference stays outside the APK. Fine grids and broad turbine sectors are
 * static pixels; carriers rotate as whole images, with no runtime blur or shader.
 */
import { arcPath, polar } from '../../src/core/geometry.ts';

/** Deterministic white mask canvas for the 432-unit watch coordinate space. */
function doc(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><g fill="white">${body}</g></svg>`;
}

/** Short annular stroke with a faint baked shoulder, never a runtime blur. */
function arc(r: number, start: number, end: number, width: number, alpha = 1): string {
  const d = arcPath(r, start, end);
  return `<path d="${d}" fill="none" stroke="white" stroke-width="${width + 2}" opacity="${alpha * 0.055}"/><path d="${d}" fill="none" stroke="white" stroke-width="${width}" opacity="${alpha}"/>`;
}

/** A technical grid lives behind the outer instruments, leaving the clock black. */
function grid(): string {
  let body = '';
  for (let n = 24; n < 432; n += 24) body += `<path d="M${n} 0V432 M0 ${n}H432"/>`;
  return doc('<defs><clipPath id="annulus"><path clip-rule="evenodd" d="M216 7A209 209 0 1 1 215.99 7Z M216 62A154 154 0 1 1 215.99 62Z"/></clipPath></defs>'
    + `<g clip-path="url(#annulus)" fill="none" stroke="white" stroke-width="0.6" opacity="0.26">${body}</g>`);
}

/** Fixed fine calibration ticks with sparse circuit traces around the perimeter. */
function bezel(): string {
  let body = arc(202, 0, 360, 0.65, 0.8);
  for (let i = 0; i < 180; i++) {
    const major = i % 15 === 0;
    const [x, y] = polar(major ? 201 : 205, i * 2);
    const [ex, ey] = polar(208, i * 2);
    body += `<path d="M${x} ${y}L${ex} ${ey}" stroke="white" stroke-width="${major ? 1.5 : 0.65}" opacity="${major ? 0.95 : 0.55}"/>`;
  }
  return doc(body);
}

/** Broad asymmetric cyan sectors and dense index marks mimic the reference turbine. */
function outer(): string {
  let body = [[3, 17], [43, 79], [121, 133], [167, 222], [259, 274], [304, 338]]
    .map(([a, b], i) => arc(190, a, b, i % 2 ? 11 : 16, i % 2 ? 0.63 : 0.92)).join('');
  body += [[21, 107], [137, 159], [232, 297], [344, 357]].map(([a, b]) => arc(194, a, b, 1, 0.6)).join('');
  for (let i = 0; i < 144; i++) {
    if (i % 36 > 29) continue;
    body += arc(179, i * 2.5, i * 2.5 + 0.65, i % 12 === 0 ? 7 : 3.5, i % 12 === 0 ? 0.85 : 0.48);
  }
  return doc(body);
}

/** Counter-rotating outlined index windows, interrupted by solid leading segments. */
function inner(): string {
  let body = [[0, 74], [92, 157], [181, 248], [271, 339]].map(([a, b]) => arc(166, a, b, 4, 0.7)).join('');
  for (let i = 0; i < 30; i++) {
    if (i % 10 === 8) continue;
    const angle = i * 12;
    body += `<g transform="rotate(${angle},216,216)"><rect x="211" y="46" width="10" height="8" fill="${i % 5 === 0 ? 'white' : 'none'}" stroke="white" stroke-width="0.8" opacity="${i % 5 === 0 ? 0.9 : 0.65}"/></g>`;
  }
  return doc(body);
}

/** Fixed core arcs, an upper wireframe sphere and restrained readout brackets. */
function core(): string {
  let body = [[-67, 67], [113, 247]].map(([a, b]) => arc(153, a, b, 1.2, 0.6)).join('');
  body += [[-51, -14], [0, 43], [139, 162], [185, 226]].map(([a, b]) => arc(147, a, b, 2.4, 0.4)).join('');
  body += '<g fill="none" stroke="white" stroke-width="0.7" opacity="0.42"><circle cx="216" cy="86" r="13"/><ellipse cx="216" cy="86" rx="6" ry="13"/><ellipse cx="216" cy="86" rx="13" ry="5"/><path d="M203 86H229 M216 73V99"/></g>';
  body += '<g fill="none" stroke="white" stroke-width="1" opacity="0.65"><path d="M105 117V112H116 M316 112H327V117 M184 300H178V292 M254 292V300H248 M156 325V315H165 M267 315H276V325 M156 349V359H165 M267 359H276V349"/></g>';
  return doc(body);
}

/** Slowly breathing light stays on arc edges clear of time and readouts. */
function pulse(): string {
  return doc([[-58, -31], [31, 58], [122, 144], [216, 238]].map(([a, b]) => arc(157, a, b, 2, 0.55)).join(''));
}

/** One tapered radar sweep travels outside the core, independent of real seconds. */
function sweep(): string {
  return doc(Array.from({ length: 28 }, (_, i) => arc(199, 359 - i, 360 - i, 1.6, Math.pow(1 - i / 28, 2) * 0.9)).join(''));
}

/** Every mask source, including its baked low-alpha glow. */
export function maskSvgs(): Record<string, string> {
  return {
    jarvis_grid: grid(), jarvis_bezel: bezel(), jarvis_outer: outer(),
    jarvis_inner: inner(), jarvis_core: core(), jarvis_pulse: pulse(),
    jarvis_sweep: sweep(), jarvis_seconds: doc('<path d="M214 9H218V16H214Z"/>'),
  };
}
