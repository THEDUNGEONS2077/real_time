/**
 * VECTOR artwork: original navigation rails, chevrons and wing-shaped brackets.
 * Narrow shoulders provide baked light. Every moving carrier is a static mask;
 * the system only transforms images, never computes a live glow or material.
 */
import { arcPath, polar } from '../../src/core/geometry.ts';

/** Deterministic white-alpha canvas, shared by preview and WFF packing. */
function doc(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><g fill="white">${body}</g></svg>`;
}

/** Instrument arc with a faint narrow shoulder baked into the mask. */
function arc(r: number, start: number, end: number, width: number, alpha = 1): string {
  const d = arcPath(r, start, end);
  return `<path d="${d}" fill="none" stroke="white" stroke-width="${width + 3}" opacity="${alpha * 0.05}"/><path d="${d}" fill="none" stroke="white" stroke-width="${width}" opacity="${alpha}"/>`;
}

/** Thin recessed outer dial; the open centre stays black. */
function shell(): string {
  return doc('<path fill-rule="evenodd" d="M216 8A208 208 0 1 1 215.99 8Z M216 37A179 179 0 1 1 215.99 37Z"/>');
}

/** Broken instrument rails and four engraved axis pointers. */
function steel(): string {
  let body = arc(207, 0, 360, 0.8, 0.65) + arc(178, 0, 360, 0.7, 0.5);
  for (const angle of [0, 90, 180, 270]) {
    body += `<g transform="rotate(${angle},216,216)" fill="none" stroke="white" opacity="0.8"><path d="M209 15L216 22L223 15 M208 29H224" stroke-width="1"/></g>`;
    body += arc(202, angle + 12, angle + 78, 0.6, 0.5);
  }
  return doc(body);
}

/** Fixed minute ticks and short paired index windows. */
function bezel(): string {
  let body = '';
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x, y] = polar(major ? 191 : 196, i * 6), [ex, ey] = polar(200, i * 6);
    body += `<path d="M${x} ${y}L${ex} ${ey}" stroke="white" stroke-width="${major ? 1.4 : 0.65}" opacity="${major ? 0.85 : 0.4}"/>`;
  }
  return doc(body);
}

/** Asymmetric course rails with arrowheads and tiny graduation bundles. */
function outer(): string {
  let body = [[8, 83], [103, 143], [181, 246], [272, 329]]
    .map(([a, b]) => arc(184, a, b, 2.3, 0.72)).join('');
  for (const angle of [8, 103, 181, 272]) {
    body += `<g transform="rotate(${angle},216,216)"><path d="M212 26L221 32L212 38L215 32Z" opacity="0.95"/></g>`;
  }
  for (let i = 0; i < 72; i++) {
    if (i % 18 > 6) continue;
    body += `<g transform="rotate(${i * 5 + 12},216,216)"><path d="M215 36V40" stroke="white" stroke-width="0.7" opacity="0.42"/></g>`;
  }
  return doc(body);
}

/** Amber counter-rotating broken ring, with long vector chevrons instead of fins. */
function inner(): string {
  let body = [[9, 67], [117, 172], [204, 252], [298, 339]]
    .map(([a, b]) => arc(166, a, b, 1.1, 0.7)).join('');
  for (const angle of [0, 96, 192, 288]) {
    body += `<g transform="rotate(${angle},216,216)" fill="none" stroke="white"><path d="M200 54L216 61L232 54 M207 48L216 52L225 48" stroke-width="1.4" opacity="0.8"/></g>`;
  }
  for (let i = 0; i < 36; i++) {
    if (i % 9 > 4) continue;
    body += arc(160, i * 10 + 3, i * 10 + 4.5, 1, 0.38);
  }
  return doc(body);
}

/** Thin dark information plane and separate date/battery/shortcut wells. */
function shield(): string {
  return doc('<path d="M91 151H341L365 175V257L341 281H91L67 257V175Z"/>'
    + '<path d="M100 108H332V143H100Z M168 278H264V309H168Z M148 312H284V362H148Z"/>');
}

/** Open corner brackets and lateral horizon ladders frame the clock without boxing it. */
function frame(): string {
  let body = '<g fill="none" stroke="white" opacity="0.7" stroke-width="0.8"><path d="M117 153H92L69 176V192 M315 153H340L363 176V192 M69 240V256L92 279H117 M363 240V256L340 279H315 M121 142H311 M185 310H247 M160 318H153V354H160 M272 318H279V354H272"/></g>';
  for (let i = -3; i <= 3; i++) {
    const y = 216 + i * 7;
    body += `<path d="M${i === 0 ? 36 : 43} ${y}H${i === 0 ? 59 : 53} M${i === 0 ? 373 : 379} ${y}H${i === 0 ? 396 : 389}" stroke="white" stroke-width="0.8" opacity="0.65"/>`;
  }
  body += '<g fill="none" stroke="white" stroke-width="0.7" opacity="0.65"><path d="M216 66L236 86L216 106L196 86Z M203 86H229 M216 73V99 M196 376H236 M202 381H230 M209 386H223"/></g>';
  return doc(body);
}

/** Cyan wing-shaped corner strokes and small vertical course rails. */
function bus(): string {
  return doc('<g fill="none" stroke="white" stroke-width="1.6" opacity="0.85"><path d="M139 160H99L77 182 M293 160H333L355 182 M77 250L99 272H139 M355 250L333 272H293"/></g>'
    + '<g fill="none" stroke="white" stroke-width="0.8" opacity="0.45"><path d="M161 154H187 M245 154H271 M161 278H187 M245 278H271 M216 40V59 M216 396V390"/></g>');
}

/** Amber steering cues; decorative, never presented as actual heading telemetry. */
function latches(): string {
  return doc('<g fill="none" stroke="white" stroke-width="1.2" opacity="0.85"><path d="M57 207L64 216L57 225 M375 207L368 216L375 225 M201 355L216 361L231 355"/></g>'
    + '<path d="M118 106H141V108H118Z M291 106H314V108H291Z" opacity="0.65"/>');
}

/** Small upper diamond and two shoulder beacons pulse as one static image. */
function pulse(): string {
  return doc('<path d="M216 77L225 86L216 95L207 86Z" opacity="0.12"/>'
    + '<g fill="none" stroke="white" stroke-width="1.2" opacity="0.9"><path d="M212 82L216 78L220 82 M212 90L216 94L220 90 M87 167L81 173 M345 167L351 173"/></g>');
}

/** Short orbit trace with a tapered baked tail. */
function sweep(): string {
  return doc(Array.from({ length: 20 }, (_, i) => arc(174, 359 - i, 360 - i, 1.4, Math.pow(1 - i / 20, 2) * 0.8)).join(''));
}

/** Original mask collection, including the seconds index and its safe margin. */
export function maskSvgs(): Record<string, string> {
  return {
    vector_shell: shell(), vector_steel: steel(), vector_bezel: bezel(),
    vector_outer: outer(), vector_inner: inner(), vector_shield: shield(),
    vector_frame: frame(), vector_bus: bus(), vector_latches: latches(),
    vector_pulse: pulse(), vector_sweep: sweep(),
    vector_seconds: doc('<path d="M213 10H219L216 17Z"/>'),
  };
}
