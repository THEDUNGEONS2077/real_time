/**
 * REDLINE design layer: palettes, layout, motion and the decorative scene.
 *
 * Concentric red instrument rings turn around a fixed centre: battery, date,
 * time and a Timer complication. Rings are driven by platform clock sources only
 * (no infinite animation loops, which stopped after a face switch in 0.2.0).
 */
import type { NumberValue } from '../../src/core/expr.ts';
import { daySecond, daySeconds, op, second, tiltX, tiltY } from '../../src/core/expr.ts';
import { polar } from '../../src/core/geometry.ts';
import type { Group, Node, Palette, Role, Shape } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';

/* ------------------------------------------------------------------ palettes */

/** Roles shared by every palette: near-black ground, light ink, graphite lines and the warning amber. */
const neutral = { ground: '#030405', ink: '#edf0f1', line: '#343a3e', warning: '#ffb24a' } as const;

/** Six accent palettes. Only the accent pair changes, so readouts stay equally legible in all of them. */
export const palettes = {
  REFERENCE: { ...neutral, accent: '#ff202b', accentDeep: '#9c121b' },
  AMBER: { ...neutral, accent: '#ffe160', accentDeep: '#a87921' },
  CYAN: { ...neutral, accent: '#20dcff', accentDeep: '#14738e' },
  GREEN: { ...neutral, accent: '#74ff6b', accentDeep: '#328f41' },
  VIOLET: { ...neutral, accent: '#c78aff', accentDeep: '#7044aa' },
  ICE: { ...neutral, accent: '#c8edff', accentDeep: '#658aab' },
} satisfies Record<string, Palette>;
export type PaletteId = keyof typeof palettes;

/** Editor labels; the IDs above are stable and stored in saved settings. */
export const paletteLabels: Record<PaletteId, string> = { REFERENCE: 'REFERENCE RED', AMBER: 'AMBER', CYAN: 'CYAN', GREEN: 'GREEN', VIOLET: 'VIOLET', ICE: 'ICE' };

/* -------------------------------------------------------------------- motion */

/** Speed multipliers. STILL removes every decorative clock and sensor dependency. */
export const speeds = { STILL: 0, SLOW: 0.5, STANDARD: 1, FAST: 2 } as const;
export type Speed = keyof typeof speeds;
export const speedLabels: Record<Speed, string> = { STILL: 'STILL', SLOW: 'SLOW · 0.5×', STANDARD: 'STANDARD · 1×', FAST: 'FAST · 2×' };

/**
 * Rotation styles:
 * - SMOOTH reads the live millisecond clock every frame, so motion starts the instant the face shows.
 * - GLIDE moves for one second toward a target the clock refreshes every second (0.3.x–1.0 Smooth).
 *   It can sit still for up to a second after wake, until the next tick starts a move.
 * - DYNAMIC reads the live clock and adds a slow speed wobble.
 */
export type MotionStyle = 'SMOOTH' | 'GLIDE' | 'DYNAMIC';

/** Requested interpolation rate. What the watch delivers is measured, not assumed. */
export const smoothFps = 60;

/**
 * Base periods in seconds at 1× (they double at Slow). The two red counter-clockwise bands
 * turn at different speeds: the outer band (inner rotor, r181) once per 72 s at Slow,
 * the inset band (r163) once per 48 s.
 */
export const motion = { outer: 18, inner: 36, inset: 24, outerModulation: 6, innerModulation: 20, insetModulation: 14, pulse: 2.4, radar: 12 } as const;

/** The six independently switchable effects. IDs are stable across releases. */
export const effects = ['seconds', 'ring_a', 'ring_b', 'breathing', 'scan', 'tilt'] as const;
export type EffectId = typeof effects[number];
export const effectLabels: Record<EffectId, string> = {
  seconds: 'SECONDS BEACON', ring_a: 'OUTER ROTOR', ring_b: 'INNER COUNTER-ROTOR',
  breathing: 'SUBTLE ACCENT PULSE', scan: 'RADAR SWEEP', tilt: 'WRIST DEPTH',
};

/* -------------------------------------------------------------------- layout */

/**
 * Fixed layout on the 432-unit canvas (Watch7 40 mm is 432 px).
 * Everything readable sits inside the 145-unit inner opening:
 * battery (top) · date · time (centred on 216,216) · complication (bottom).
 */
export const layout = {
  size: 432,
  centre: 216,
  /** Foreground clearance from the round edge, including glow and tilt. */
  margin: 6,
  maxTilt: 2,
  innerRadius: 145,
  battery: { x: 176, y: 80, width: 80, height: 24 },
  date: { x: 96, y: 118, width: 240, height: 30 },
  complication: { x: 156, y: 290, width: 120, height: 52 },
} as const;

/* ---------------------------------------------------------- shape shorthands */

const line = (x: number, y: number, x2: number, y2: number, role: Role = 'line', alpha = 130, stroke = 0.7): Shape =>
  ({ kind: 'line', x, y, x2, y2, role, alpha, stroke });
const arc = (r: number, start: number, end: number, role: Role = 'accent', alpha: NumberValue = 220, stroke = 2): Shape =>
  ({ kind: 'arc', r, start, end, role, alpha, stroke });
const group = (name: string, children: Node[], extra: Partial<Group> = {}): Group => ({ kind: 'group', name, children, ...extra });
const toggle = (setting: EffectId, on: Node[], off: Node[] = []): Node => ({ kind: 'switch', setting, on, off });

/** A red halo from three alpha strokes: no runtime blur, no image sequence. */
export const glowArc = (r: number, start: number, end: number, stroke = 3.2): Node[] => [
  arc(r, start, end, 'accent', 12, 12), arc(r, start, end, 'accent', 32, 8), arc(r, start, end, 'accent', 235, stroke),
];

/** Fine tick ring; every fifth tick is longer and lighter. */
const ticks = (r: number, count: number): Node[] => Array.from({ length: count }, (_, i) => {
  const major = i % 5 === 0;
  const a = polar(r - (major ? 4 : 1.8), i * 360 / count), b = polar(r, i * 360 / count);
  return line(...a, ...b, major ? 'ink' : 'line', major ? 145 : 110, major ? 1 : 0.65);
});

/* --------------------------------------------------------------------- rings */

/** Outer rotor: light bars and red segments make its rotation legible. */
export function outerRotor(): Node[] {
  return [
    arc(201, 0, 360, 'line', 180, 0.8), arc(195, 0, 360, 'line', 120, 0.7), ...ticks(200, 72),
    ...[17, 107, 197, 287].flatMap(a => [arc(193, a, a + 14, 'ink', 220, 3.2), arc(193, a + 16, a + 22, 'accent', 220, 5)]),
    ...[50, 140, 230, 320].map(a => arc(198, a, a + 3, 'accent', 190, 3)),
  ];
}

/** Inner rotor: broken red primary band with quieter graphite segments. */
export function innerRotor(): Node[] {
  return [
    arc(181, 0, 360, 'line', 125, 0.8), arc(170, 0, 360, 'line', 110, 0.7),
    ...[27, 117, 207, 297].flatMap(a => glowArc(181, a, a + 30, 5.5)),
    ...[0, 90, 180, 270].map(a => arc(176, a + 3, a + 24, 'line', 190, 5)),
    ...[50, 170, 290].map(a => arc(172, a, a + 22, 'ink', 160, 0.8)),
  ];
}

/** Corner brackets framing the complication slot, so an empty slot still reads as a target.
 *  Neutral ink like the reticle, so this cached layer is shared by all palettes. */
function complicationFrame(): Node[] {
  const { x, y, width, height } = layout.complication;
  const corners: [number, number, number, number][] = [[x, y, 1, 1], [x + width, y, -1, 1], [x, y + height, 1, -1], [x + width, y + height, -1, -1]];
  return corners.flatMap(([cx, cy, sx, sy]) => [line(cx, cy, cx + sx * 9, cy, 'ink', 140), line(cx, cy, cx, cy + sy * 9, 'ink', 140)]);
}

/* --------------------------------------------------------------------- scene */

/** The decorative scene for one speed and style. Readouts are separate fixed layers. */
export function scene(speed: Speed = 'SLOW', style: MotionStyle = 'SMOOTH'): Node[] {
  const rate = speeds[speed] || 1;
  const clock = op('*', daySeconds, rate);
  // Phase in radians of a repeating period; the modulo bounds sine arguments.
  const phase = (period: number) => op('*', op('%', clock, period), 2 * Math.PI / period);
  // The whole second one tick ahead: Smooth's interpolation target.
  const ahead = op('+', daySecond, 1);
  const angleAt = (period: number, direction: number, time: NumberValue) =>
    op('*', op('%', op('*', time, rate), period), direction * 360 / period);

  const glide = style === 'GLIDE';
  /** Steady rotation from the live clock; GLIDE adds the one-second move to the next whole-second target. */
  const rotor = (name: string, children: Node[], period: number, direction: 1 | -1): Group => group(name, children, {
    angle: angleAt(period, direction, daySeconds),
    ...(glide ? { angleTransition: { value: angleAt(period, direction, ahead), fps: smoothFps, direction: direction > 0 ? 'CLOCKWISE' : 'COUNTER_CLOCKWISE' } } : {}),
  });
  /** DYNAMIC: steady rotation plus a sine wobble of `swing` degrees. */
  const wobbling = (name: string, children: Node[], period: number, direction: 1 | -1, modulation: number, swing: number): Group =>
    group(name, children, { angle: op('+', op('*', op('%', clock, period), direction * 360 / period), op('*', swing, op('sin', phase(modulation)))) });
  /** One moving ring in the chosen style. */
  const ring = (name: string, children: Node[], period: number, direction: 1 | -1, modulation: number, swing: number): Group =>
    style === 'DYNAMIC' ? wobbling(name, children, period, direction, modulation, swing) : rotor(name, children, period, direction);

  const outer = outerRotor();
  const inner = innerRotor();
  // The inset red band turns on its own carrier, faster than the inner rotor. Breathing changes only its opacity.
  const insetBand: Node[] = [24, 117, 204, 297].flatMap(a => glowArc(163, a, a + 39, 5.5));
  const breathing = (time: NumberValue) => op('+', 205, op('*', 35, op('sin', op('*', op('%', op('*', time, rate), motion.pulse), 2 * Math.PI / motion.pulse))));
  const pulse = group('red_pulse', insetBand, {
    alpha: breathing(daySeconds),
    ...(glide ? { alphaTransition: { value: breathing(ahead), fps: smoothFps } } : {}),
  });
  const inset: Node[] = [toggle('breathing', [pulse], insetBand)];

  // ring_b switches both counter-clockwise bands; when off they hold their reference pose.
  const rings: Node[] = [
    toggle('ring_a', [ring('outer_rotor', outer, motion.outer, 1, motion.outerModulation, 7)], outer),
    toggle('ring_b', [ring('inner_rotor', inner, motion.inner, -1, motion.innerModulation, 5), ring('inset_rotor', inset, motion.inset, -1, motion.insetModulation, 4)], [...inner, ...inset]),
  ];

  // Reticle corners around the clock.
  const reticle: Node[] = [[64, 160, 1, 1], [368, 160, -1, 1], [64, 272, 1, -1], [368, 272, -1, -1]].flatMap(([x, y, sx, sy]) => [
    line(x, y, x + sx * 11, y, 'ink', 140), line(x, y, x, y + sy * 11, 'ink', 140),
    { kind: 'rect', x: x - 1, y: y - 1, width: 2, height: 2, role: 'ink', alpha: 220 } as Shape,
  ]);

  const secondsBeacon = group('seconds_beacon', [arc(203, 0, 1.4, 'ink', 255, 2), arc(203, 0, 1.4, 'accent', 25, 7)], {
    angle: op('*', second, 6),
    ...(glide ? { angleTransition: { value: op('*', op('%', ahead, 60), 6), fps: smoothFps, direction: 'CLOCKWISE' as const } } : {}),
  });

  const nodes: Node[] = [
    { kind: 'image', resource: 'redline_mesh', alpha: 110, role: 'line' },
    // Tilt shifts both rotors by at most 2 units; readouts never move.
    toggle('tilt', [group('depth', rings, { x: op('*', tiltX, 2 / 3), y: op('*', tiltY, 2 / 3), gyro: true })], rings),
    arc(162, 0, 360, 'line', 85, 0.7), arc(145, 0, 360, 'line', 75, 0.7),
    ...Array.from({ length: 48 }, (_, i) => arc(207, i * 7.5 + 0.5, i * 7.5 + 4.6, i % 6 === 0 ? 'accentDeep' : 'line', i % 6 === 0 ? 100 : 120, 3.2)),
    // Two hairlines flank the battery readout.
    ...[-1, 1].flatMap(direction => {
      const x = 216 + direction * 62;
      return [line(x, 59, x, 117, 'accent', 120, 0.6), { kind: 'rect', x: x - 1, y: 96, width: 2, height: 4, role: 'accent', alpha: 200 } as Shape];
    }),
    toggle('scan', [rotor('radar_sweep', [arc(151, 0, 25, 'accent', 24, 7), arc(151, 23, 25, 'accent', 150, 1.3)], motion.radar, 1)]),
    ...[0, 90, 180, 270].flatMap(a => {
      const p = polar(195, a), q = polar(207, a), r = polar(191, a);
      return [line(...p, ...q, 'ink', 240, 2.3), line(...r, ...p, 'accent', 200, 1.2)];
    }),
    ...[0, 90, 180, 270].map(a => {
      const [x, y] = polar(201, a);
      return { kind: 'image', resource: 'redline_glow', x: x - 6, y: y - 6, width: 12, height: 12, role: 'accent', alpha: 90 } as Node;
    }),
    toggle('seconds', [secondsBeacon]),
    // Dark disc behind the readouts keeps text contrast over the mesh.
    { kind: 'circle', x: 216, y: 216, r: 142, role: 'ground', alpha: 245 },
    ...reticle,
    ...complicationFrame(),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
