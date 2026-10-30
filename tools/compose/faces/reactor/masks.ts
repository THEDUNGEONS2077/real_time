/**
 * REACTOR artwork: machined titanium plates and energy carriers authored as SVG.
 * All bevels, vents and soft light become static mask pixels at build time.
 * Whole-image rotation supplies movement; no materials shader or live blur runs.
 */
import { arcPath, polar } from '../../src/core/geometry.ts';

/** Deterministic white-alpha mask canvas. */
function doc(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><g fill="white">${body}</g></svg>`;
}

/** Annular energy stroke with a narrow, faint baked shoulder. */
function arc(r: number, start: number, end: number, width: number, alpha = 1): string {
  const d = arcPath(r, start, end);
  return `<path d="${d}" fill="none" stroke="white" stroke-width="${width + 3}" opacity="${alpha * 0.05}"/><path d="${d}" fill="none" stroke="white" stroke-width="${width}" opacity="${alpha}"/>`;
}

/** Dark metal backplate; the unlit centre and ambient stay black. */
function shell(): string {
  return doc('<path fill-rule="evenodd" d="M216 8A208 208 0 1 1 215.99 8Z M216 41A175 175 0 1 1 215.99 41Z"/>');
}

/** Fixed precision rails, eight fasteners and interrupted diagonal cooling vents. */
function steel(): string {
  let body = arc(207, 0, 360, 1, 0.9) + arc(201, 0, 360, 1, 0.45) + arc(177, 0, 360, 1, 0.65);
  for (const angle of [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]) {
    body += `<g transform="rotate(${angle},216,216)" fill="none" stroke="white"><path d="M211 13L221 13L224 17L221 21L211 21L208 17Z" stroke-width="0.8" opacity="0.8"/><path d="M212 17H220" stroke-width="1" opacity="0.4"/></g>`;
  }
  for (let i = 0; i < 64; i++) {
    if (i % 16 > 9) continue;
    body += `<g transform="rotate(${i * 5.625},216,216)" stroke="white" stroke-width="1" opacity="0.34"><path d="M214 20L217 25"/></g>`;
  }
  return doc(body);
}

/** Amber minute index and four deliberate breaks keep the outer edge readable. */
function bezel(): string {
  let body = '';
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x, y] = polar(major ? 197 : 199, i * 6), [ex, ey] = polar(201, i * 6);
    body += `<path d="M${x} ${y}L${ex} ${ey}" stroke="white" stroke-width="${major ? 1.7 : 0.7}" opacity="${major ? 0.75 : 0.35}"/>`;
  }
  return doc(body);
}

/** Unequal bundles of energy cells make slow forward rotation visible. */
function outer(): string {
  let body = '';
  for (let i = 0; i < 72; i++) {
    if (i % 18 > 12 || (i >= 37 && i <= 41)) continue;
    body += arc(188, i * 5, i * 5 + 2.8, i % 18 < 3 ? 10 : 5.5, i % 18 < 3 ? 0.95 : 0.48);
  }
  body += [[2, 58], [92, 135], [208, 243], [274, 327]].map(([a,b]) => arc(181, a, b, 0.9, 0.6)).join('');
  return doc(body);
}

/** Counter-rotating containment rail with red fins and four asymmetrical sockets. */
function inner(): string {
  let body = [[5, 82], [111, 173], [194, 251], [284, 342]].map(([a,b]) => arc(166, a, b, 2.1, 0.68)).join('');
  for (let i = 0; i < 24; i++) {
    if (i % 6 === 5) continue;
    body += `<g transform="rotate(${i * 15},216,216)"><path d="M211 45H218L223 53H216Z" opacity="${i % 6 === 0 ? 0.85 : 0.32}"/></g>`;
  }
  return doc(body);
}

/** Opaque armoured bridge and individual wells protect live text from the rings. */
function shield(): string {
  return doc('<path d="M82 146H350L383 179V253L350 286H82L49 253V179Z"/>'
    + '<path d="M114 104H318L331 117V141H101V117Z M168 278H264V310H168Z M148 310H284V364H148Z"/>');
}

/** Machined bevel strips and etched edges give depth without a runtime filter. */
function frame(): string {
  const outline = 'M84 150H348L379 181V251L348 282H84L53 251V181Z';
  return doc(`<path d="${outline}" fill="none" stroke="white" stroke-width="1" opacity="0.8"/>`
    + '<path d="M84 151H348L338 161H94Z M54 182L66 190V242L54 250Z M378 182L366 190V242L378 250Z M84 281H348L338 271H94Z" opacity="0.35"/>'
    + '<g fill="none" stroke="white" stroke-width="0.6" opacity="0.65"><path d="M96 164H336 M96 268H336 M69 190V242 M363 190V242 M115 106H317 M149 314H283V360H149Z"/></g>'
    + '<g fill="none" stroke="white" stroke-width="0.8" opacity="0.8"><path d="M199 71H233L242 85L233 99H199L190 85Z M206 76H226L232 85L226 94H206L200 85Z"/></g>');
}

/** Amber energy buses run into the bridge shoulders, clear of the digits. */
function bus(): string {
  return doc('<g fill="none" stroke="white" stroke-width="1.2" opacity="0.8"><path d="M107 151H84L53 182V195 M325 151H348L379 182V195 M53 237V250L84 281H107 M379 237V250L348 281H325 M126 106H153 M279 106H306 M187 308H245"/></g>'
    + '<g opacity="0.7"><path d="M145 151H160V154H145Z M272 151H287V154H272Z M145 278H160V281H145Z M272 278H287V281H272Z"/></g>');
}

/** Small red tension latches and low-contrast diagonal hazard cuts. */
function latches(): string {
  let body = '<path d="M54 202H58V229H54Z M374 202H378V229H374Z" opacity="0.8"/>';
  for (const x of [88, 97, 106, 319, 328, 337]) body += `<path d="M${x} 155L${x + 4} 155L${x - 1} 161L${x - 5} 161Z" opacity="0.6"/>`;
  body += '<g fill="none" stroke="white" stroke-width="1" opacity="0.7"><path d="M156 324V317H165 M267 317H276V324 M156 350V357H165 M267 357H276V350"/></g>';
  return doc(body);
}

/** A quiet upper hexagonal core and shoulder lights breathe together. */
function pulse(): string {
  const hex = 'M209 78H223L228 85L223 92H209L204 85Z';
  return doc(`<path d="${hex}" opacity="0.12"/><path d="${hex}" fill="none" stroke="white" stroke-width="1.5" opacity="0.8"/>`
    + '<path d="M62 205H65V227H62Z M367 205H370V227H367Z" opacity="0.48"/>');
}

/** Tapered charge trace between the moving rotor and fixed minute index. */
function sweep(): string {
  return doc(Array.from({ length: 24 }, (_, i) => arc(195, 359 - i, 360 - i, 1.5, Math.pow(1 - i / 24, 2) * 0.9)).join(''));
}

/** Original mask collection; all luminous edges include their baked glow. */
export function maskSvgs(): Record<string, string> {
  return {
    reactor_shell: shell(), reactor_steel: steel(), reactor_bezel: bezel(),
    reactor_outer: outer(), reactor_inner: inner(), reactor_shield: shield(),
    reactor_frame: frame(), reactor_bus: bus(), reactor_latches: latches(),
    reactor_pulse: pulse(), reactor_sweep: sweep(),
    reactor_seconds: doc('<path d="M216 9L219 14L216 19L213 14Z"/>'),
  };
}
