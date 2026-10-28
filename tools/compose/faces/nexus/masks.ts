/**
 * NEXUS artwork: watch-native SVG masks, rasterized at build time.
 * Thin circuitry and smoked bevels evoke Cyberdeck without copying its wallpapers.
 * The clock aperture is black; light stays on edges and purposeful signal tracks.
 */
import { arcPath, polar } from '../../src/core/geometry.ts';
import { outlineSource } from '../../src/fonts/outline.ts';

/** Wrap white-alpha artwork in a deterministic SVG canvas. */
function doc(body: string, width = 432, height = 432): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="white">${body}</g></svg>`;
}

/** One polar stroke on the common centre, including a baked soft shoulder. */
function arc(radius: number, start: number, end: number, width: number, alpha = 1): string {
  const d = arcPath(radius, start, end);
  return `<path d="${d}" fill="none" stroke="white" stroke-width="${width + 3}" opacity="${alpha * 0.07}"/><path d="${d}" fill="none" stroke="white" stroke-width="${width}" opacity="${alpha}"/>`;
}

/** Static minute subdivisions leave a six-unit circular edge margin. */
function bezel(): string {
  const ticks = Array.from({ length: 120 }, (_, i) => {
    const major = i % 10 === 0;
    const [x1, y1] = polar(major ? 200 : 205, i * 3);
    const [x2, y2] = polar(208, i * 3);
    return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="white" stroke-width="${major ? 1.6 : 0.65}" opacity="${major ? 1 : 0.7}"/>`;
  }).join('');
  return doc(ticks + '<circle cx="216" cy="216" r="202" fill="none" stroke="white" stroke-width="0.6" opacity="0.7"/>');
}

/** Asymmetric mechanical segments make even slow rotation legible. */
function rotor(): string {
  const arcs = [[4, 67], [112, 149], [192, 259], [299, 322]];
  let body = arcs.map(([a, b]) => arc(190, a, b, 3.2, 0.9)).join('');
  for (let i = 0; i < 72; i++) {
    if (i % 18 > 12) continue;
    body += arc(184, i * 5, i * 5 + 1.2, 2, i % 6 === 0 ? 0.85 : 0.3);
  }
  for (const [a] of arcs) {
    const [x1, y1] = polar(182, a), [x2, y2] = polar(196, a);
    body += `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="white" stroke-width="1.2"/>`;
  }
  return doc(body);
}

/** Sparse terminal characters travel as one bitmap, not individual text nodes. */
function codeOrbit(): string {
  const font = outlineSource('share-tech-mono/ShareTechMono-Regular.ttf');
  const [, top, , bottom] = font.box('0');
  const scale = 7.5 / (bottom - top);
  const sequence = '01:7F<>A2/09:CE+4';
  let body = '';
  for (let i = 0; i < 84; i++) {
    if (i % 14 > 9) continue;
    const char = sequence[i % sequence.length];
    const [x1, y1, x2, y2] = font.box(char);
    const angle = i * 360 / 84;
    const [x, y] = polar(173, angle);
    body += `<g transform="translate(${x},${y}) rotate(${angle}) scale(${scale}) translate(${-(x1 + x2) / 2},${-(y1 + y2) / 2})" opacity="${i % 7 === 0 ? 0.85 : 0.35}">${font.body(char)}</g>`;
  }
  return doc(body);
}

/** Fixed opaque shields prevent rotating detail from crossing readable content. */
function panel(): string {
  return doc('<path d="M79 148H353L390 185V247L353 284H79L42 247V185Z"/>'
    + '<path d="M118 100H314L327 113V137L314 150H118L105 137V113Z"/>'
    + '<path d="M164 278H268V309H164Z M148 311H284V363H148Z"/>');
}

/** Paired etched circuit buses, vias and upper reticle marks. */
function circuit(): string {
  let body = '<g fill="none" stroke="white" stroke-width="0.8" opacity="0.48">';
  for (const mirror of [false, true]) {
    body += `<g${mirror ? ' transform="translate(432,0) scale(-1,1)"' : ''}>`
      + '<path d="M59 178V254L93 288H127L149 310 M66 183V248L99 281H127 M74 108V142L91 159H110 M82 102V137L98 153H122 M118 80H152L165 93H188"/>'
      + '<circle cx="59" cy="176" r="2"/><circle cx="149" cy="310" r="2"/><circle cx="74" cy="106" r="2"/><circle cx="82" cy="100" r="2"/>'
      + '<rect x="108" y="157" width="4" height="4"/><rect x="120" y="151" width="4" height="4"/>'
      + '<path d="M143 101H131L122 110 M132 143H145" stroke-width="1.5" opacity="0.9"/></g>';
  }
  body += '<path d="M191 83H241 M201 87H231 M209 91H223" stroke-width="1.4" opacity="0.6"/></g>';
  return doc(body);
}

/** A quiet wireframe lower fan and network nodes, cut around the Timer tile. */
function horizon(): string {
  let body = '<g fill="none" stroke="white" stroke-width="0.7" opacity="0.22">';
  for (const x of [118, 148, 182, 216, 250, 284, 314]) {
    body += `<path d="M216 306L${x} 378"/>`;
  }
  for (const [y, w] of [[327, 25], [339, 41], [356, 65], [378, 98]]) {
    body += `<path d="M${216 - w} ${y}H${216 + w}"/>`;
  }
  body += '</g>'
    + '<g fill="none" stroke="white" stroke-width="0.8" opacity="0.45"><path d="M111 314L134 330L121 349L111 314L94 306 M321 314L298 330L311 349L321 314L338 306"/>'
    + [ [111,314], [134,330], [121,349], [321,314], [298,330], [311,349] ].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>';
  // A geometric hole keeps the Timer tile clear. A luminance mask would change
  // opacity when the SVG preview replaces white with a palette colour.
  return doc(`<defs><clipPath id="grid"><path clip-rule="evenodd" d="M0 0H432V432H0Z M148 311H284V363H148Z"/></clipPath></defs><g clip-path="url(#grid)">${body}</g>`);
}

/** Bevelled console frame: strong corners, restrained edges, black behind the clock. */
function frameMask(): string {
  const outline = 'M79 153H353L385 185V247L353 279H79L47 247V185Z';
  return doc(`<path d="${outline}" fill="none" stroke="white" stroke-width="5" opacity="0.04"/>`
    + `<path d="${outline}" fill="none" stroke="white" stroke-width="0.75" opacity="0.32"/>`
    + '<g fill="none" stroke="white" stroke-width="2" opacity="0.85"><path d="M110 153H79L47 185V201 M322 153H353L385 185V201 M47 231V247L79 279H110 M385 231V247L353 279H322"/></g>'
    + '<g fill="none" stroke="white" stroke-width="0.7" opacity="0.35"><path d="M89 161H343 M89 271H343 M131 103H301 M143 146H289 M156 325V315H170 M262 315H276V325 M156 349V359H170 M262 359H276V349"/></g>');
}

/** Smoked facet faces and tiny edge highlights. Glow never washes over the digits. */
function facets(): string {
  return doc('<path d="M79 154H353L342 164H90Z M48 186L61 194V238L48 246Z M384 186L371 194V238L384 246Z M79 278H353L342 268H90Z" opacity="0.075"/>'
    + '<g fill="none" stroke="white" stroke-width="0.8" opacity="0.55"><path d="M91 164H341 M91 268H341 M63 193V239 M369 193V239"/></g>'
    + '<path d="M163 74H194V77H163Z M238 74H269V77H238Z" opacity="0.55"/>');
}

/** Short tapered sweep, distinct from the accurate minute marker. */
function sweep(): string {
  return doc(Array.from({ length: 36 }, (_, i) => arc(198, 359 - i, 360 - i, 1.7, Math.pow(1 - i / 36, 2) * 0.85)).join(''));
}

/** Every mask source; all glow is generated here rather than at runtime. */
export function maskSvgs(): Record<string, string> {
  return {
    nexus_bezel: bezel(), nexus_rotor: rotor(), nexus_code: codeOrbit(),
    nexus_circuit: circuit(), nexus_horizon: horizon(), nexus_panel: panel(),
    nexus_frame: frameMask(), nexus_facets: facets(), nexus_sweep: sweep(),
    nexus_seconds: doc('<path d="M213.5 10H218.5V17H213.5Z"/>'),
    nexus_packet: doc('<path d="M3 1V11" stroke="white" stroke-width="1" opacity="0.3"/><ellipse cx="3" cy="10" rx="2.5" ry="3.5" opacity="0.12"/><circle cx="3" cy="10" r="1.2"/>', 6, 14),
  };
}
