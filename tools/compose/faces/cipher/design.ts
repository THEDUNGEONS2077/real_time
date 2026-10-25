/**
 * CIPHER design layer: palettes, layout, motion and the decorative scene.
 *
 * A green phosphor terminal HUD. Rings of matrix glyphs turn in opposite directions
 * around a fixed centre. Between them is a segmented arc ring, a comet sweeps the
 * outer track, and a few rain columns fall behind it all. Every moving piece is one
 * pre-baked mask whose angle or position comes straight from the live clock each
 * frame, so motion starts the instant the face is shown and each ring costs one draw.
 */
import { daySeconds, op, second } from '../../src/core/expr.ts';
import type { NumberValue } from '../../src/core/expr.ts';
import type { Group, ImageNode, Node, Palette, Role } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';
import { rainColumn, rainHeight } from './assets.ts';

/* ------------------------------------------------------------------ palettes */

/**
 * The cyberdeck_terminal palettes: accent and deep accent drive the rings, the bright
 * text colour drives the readouts, the dim text colour drives quiet tracks.
 */
const palette = (accent: string, accentDeep: string, ink: string, line: string, warning = '#ff5a2a'): Palette =>
  ({ ground: '#000000', accent, accentDeep, ink, line, warning });
export const palettes = {
  PHOSPHOR: palette('#39ff14', '#1f8f2c', '#b6ffb0', '#2b903f'),
  AMBER: palette('#ffb000', '#a06c00', '#ffe2a8', '#a8761c', '#ff3040'),
  ICE: palette('#1ee8ff', '#0a7f8f', '#b9f5ff', '#1f8ea3'),
  NEON: palette('#ff3fdc', '#9a1a82', '#ffc6f2', '#cc4fb0'),
  BLOOD: palette('#ff3040', '#a0181f', '#ffc8cc', '#d4545e', '#ffe2a8'),
  AZURE: palette('#3ca0ff', '#1a5fb0', '#cfe4ff', '#3d84d0'),
} satisfies Record<string, Palette>;
export type PaletteId = keyof typeof palettes;

/* -------------------------------------------------------------------- motion */

/** Speed multipliers. STILL removes every clock dependency from the decoration. */
export const speeds = { STILL: 0, SLOW: 0.5, STANDARD: 1, FAST: 2 } as const;
export type Speed = keyof typeof speeds;
export const speedLabels: Record<Speed, string> = { STILL: 'STILL', SLOW: 'SLOW · 0.5×', STANDARD: 'STANDARD · 1×', FAST: 'FAST · 2×' };

/**
 * Seconds per revolution at 1× (doubled at Slow). Positive turns clockwise.
 * Slow rates: outer code 3°/s, arc ring 6°/s the other way, inner code 4°/s, sweep 18°/s.
 */
export const motion = { outerCode: 60, arcRing: -30, innerCode: 45, sweep: 10 } as const;

/** Rain columns: x position, seconds per fall at 1×, phase offset (fraction of a fall), image seed. */
export const rain = [
  { x: 70, period: 5.2, phase: 0.1, seed: 11 },
  { x: 112, period: 4.1, phase: 0.62, seed: 23 },
  { x: 150, period: 6.0, phase: 0.35, seed: 37 },
  { x: 198, period: 4.7, phase: 0.85, seed: 41 },
  { x: 240, period: 5.6, phase: 0.2, seed: 53 },
  { x: 282, period: 3.9, phase: 0.5, seed: 67 },
  { x: 322, period: 5.0, phase: 0.75, seed: 71 },
  { x: 360, period: 4.4, phase: 0.05, seed: 89 },
] as const;

/** The five switchable effects. IDs are stable. */
export const effects = ['rain', 'code_rings', 'arc_ring', 'sweep', 'seconds'] as const;
export type EffectId = typeof effects[number];
export const effectLabels: Record<EffectId, string> = {
  rain: 'MATRIX RAIN', code_rings: 'CODE RINGS', arc_ring: 'ARC RING', sweep: 'COMET SWEEP', seconds: 'SECONDS MARK',
};

/* -------------------------------------------------------------------- layout */

/** Readable elements sit inside the 142-unit dark disc and never move. */
export const layout = {
  margin: 6,
  innerRadius: 142,
  battery: { x: 176, y: 80, width: 80, height: 24 },
  date: { x: 96, y: 118, width: 240, height: 30 },
  complication: { x: 156, y: 290, width: 120, height: 52 },
} as const;

/** Every mask image: its resource name, the role that tints it and its canvas placement. */
export const masks = {
  cipher_outer_code: { role: 'accent' },
  cipher_inner_code: { role: 'line' },
  cipher_arc_track: { role: 'line' },
  cipher_arc_segments: { role: 'accent' },
  cipher_sweep: { role: 'accent' },
  cipher_bezel: { role: 'line' },
  cipher_seconds: { role: 'ink' },
  cipher_slot_frame: { role: 'line' },
  ...Object.fromEntries(rain.map((_, i) => [`cipher_rain_${i}`, { role: 'accent' }])),
} as Record<string, { role: Role }>;

/* --------------------------------------------------------------------- scene */

/** A full-canvas mask image. */
const full = (resource: string, alpha = 255): ImageNode => ({ kind: 'image', resource, role: masks[resource].role, alpha });
const toggle = (setting: EffectId, on: Node[], off: Node[] = []): Node => ({ kind: 'switch', setting, on, off });

/** The decorative scene for one speed. Readouts and the clock are separate fixed layers. */
export function scene(speed: Speed = 'SLOW'): Node[] {
  const rate = speeds[speed] || 1;
  const clock = op('*', daySeconds, rate);
  /** Angle of a ring turning once per `period` seconds; the modulo keeps the value bounded. */
  const turn = (period: number): NumberValue => op('*', op('%', clock, Math.abs(period)), 360 / period);
  const ring = (name: string, children: Node[], period: number): Group => ({ kind: 'group', name, children, angle: turn(period) });

  // Rain: each column falls from above the screen to below it, then wraps.
  const travel = 432 + rainHeight;
  const columns: Node[] = rain.map((c, i) => {
    const image: ImageNode = { kind: 'image', resource: `cipher_rain_${i}`, role: 'accent', alpha: 255, x: c.x - rainColumn.width / 2, y: 0, width: rainColumn.width, height: rainHeight };
    const fall = op('-', op('*', op('%', op('+', clock, c.phase * c.period), c.period), travel / c.period), rainHeight);
    return { kind: 'group', name: `rain_${i}`, children: [image], y: fall } as Group;
  });
  // When rain is off, nothing is drawn: a frozen column would look like a glitch.
  const rainLayer: Node = toggle('rain', [{ kind: 'group', name: 'rain', children: columns, alpha: 160 }]);

  const outer = [full('cipher_outer_code')], inner = [full('cipher_inner_code', 200)];
  const arcs = [full('cipher_arc_track', 150), full('cipher_arc_segments')];
  const nodes: Node[] = [
    rainLayer,
    full('cipher_bezel', 170),
    toggle('code_rings', [ring('outer_code', outer, motion.outerCode), ring('inner_code', inner, motion.innerCode)], [...outer, ...inner]),
    toggle('arc_ring', [ring('arc_ring', arcs, motion.arcRing)], arcs),
    toggle('sweep', [ring('comet_sweep', [full('cipher_sweep')], motion.sweep)]),
    // Real seconds at every moving speed; it disappears in STILL with the rest of the motion.
    toggle('seconds', [{ kind: 'group', name: 'seconds_mark', children: [full('cipher_seconds')], angle: op('*', second, 6) }]),
    // Dark disc behind the readouts keeps text crisp over rain and rings.
    { kind: 'circle', x: 216, y: 216, r: layout.innerRadius, role: 'ground', alpha: 235 },
    full('cipher_slot_frame', 190),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
