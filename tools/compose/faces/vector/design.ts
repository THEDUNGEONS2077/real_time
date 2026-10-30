/**
 * VECTOR design: layered navigation rings, wing brackets and a fixed clear clock.
 * A fixed information plane masks decorative course marks behind it. Shared
 * NEXUS/JARVIS packing, explicit colours and flat controls preserve the baseline.
 */
import { daySeconds, op, second } from '../../src/core/expr.ts';
import type { NumberValue } from '../../src/core/expr.ts';
import type { Group, ImageNode, Node, Palette, Role } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';

/** Quiet blue-grey rails support distinct course, steering and readable ink roles. */
function palette(accent: string, secondary: string, ink: string): Palette {
  return { ground: '#040a10', accent, accentDeep: secondary, ink, line: '#395867', warning: '#ff745c' };
}

/** Six explicit instrument palettes; NAV is the authored ice-blue/amber design. */
export const palettes = {
  NAV: palette('#80dfff', '#ffbc66', '#e0f5ff'),
  ICE: palette('#c2f2ff', '#6499ee', '#ecfaff'),
  PHOSPHOR: palette('#80e9b1', '#d0e575', '#e5ffef'),
  EMBER: palette('#ffbb68', '#f27654', '#fff0dc'),
  VIOLET: palette('#baa0ff', '#64d9e8', '#f0eaff'),
  MONO: palette('#d4e4ef', '#8aa7bf', '#f0f7fc'),
} satisfies Record<string, Palette>;
/** Stable palette IDs. */
export type PaletteId = keyof typeof palettes;
/** Still removes live decoration; moving values scale the shared clock. */
export const speeds = { STILL: 0, SLOW: 0.5, STANDARD: 1, FAST: 2 } as const;
/** Stable speed IDs. */
export type Speed = keyof typeof speeds;
/** Accessible descriptions shown by both editors. */
export const speedLabels: Record<Speed, string> = {
  STILL: 'STILL', SLOW: 'SLOW · 0.5×', STANDARD: 'STANDARD · 1×', FAST: 'FAST · 2×',
};
/** Periods divide the local day at every speed; no midnight phase jump. */
export const motion = { outer: 60, inner: -90, sweep: 24, pulse: 10 } as const;
/** Independent optional carriers, enabled by default. */
export const effects = ['outer_rotor', 'inner_rotor', 'sweep', 'core_glow', 'seconds'] as const;
/** One optional effect. */
export type EffectId = typeof effects[number];
/** Face-specific control labels. */
export const effectLabels: Record<EffectId, string> = {
  outer_rotor: 'COURSE RING', inner_rotor: 'VECTOR RING', sweep: 'ORBIT SWEEP',
  core_glow: 'RETICLE PULSE', seconds: 'SECONDS MARK',
};
/** Retain the accepted REACTOR clock sizing and fixed readout positions. */
export const clockScale = 0.85;
/** Readable information sits inside the hardware, independent of its movement. */
export const layout = {
  margin: 6, innerRadius: 174,
  date: { x: 96, y: 112, width: 240, height: 28 },
  battery: { x: 176, y: 282, width: 80, height: 24 },
  complication: { x: 156, y: 315, width: 120, height: 44 },
} as const;

/** Mask colour roles; geometry and baked light remain palette-independent. */
export const masks: Record<string, { role: Role }> = {
  vector_shell: { role: 'ground' }, vector_steel: { role: 'line' }, vector_bezel: { role: 'accent' },
  vector_outer: { role: 'accent' }, vector_inner: { role: 'accentDeep' },
  vector_shield: { role: 'ground' }, vector_frame: { role: 'line' },
  vector_bus: { role: 'accent' }, vector_latches: { role: 'accentDeep' },
  vector_pulse: { role: 'accent' }, vector_sweep: { role: 'accent' }, vector_seconds: { role: 'ink' },
};

/** One full-canvas white mask, cropped later by the shared optimizer. */
function full(resource: string, alpha = 255): ImageNode {
  return { kind: 'image', resource, role: masks[resource].role, alpha };
}

/** Select static reference poses instead of hiding running effects at alpha zero. */
function toggle(setting: EffectId, on: Node[], off: Node[] = []): Node {
  return { kind: 'switch', setting, on, off };
}

/** Painter-ordered hardware and motion, shared by WFF and preview rendering. */
export function scene(speed: Speed = 'SLOW'): Node[] {
  const clock = op('*', daySeconds, speeds[speed] || 1);
  const phase = (period: number): NumberValue => op('/', op('%', clock, period), period);
  const turn = (period: number): NumberValue => op('*', phase(Math.abs(period)), period < 0 ? -360 : 360);
  const ring = (name: string, resource: string, period: number): Group =>
    ({ kind: 'group', name, children: [full(resource)], angle: turn(period) });
  const nodes: Node[] = [
    full('vector_shell'), full('vector_steel'), full('vector_bezel'),
    toggle('outer_rotor', [ring('outer_rotor', 'vector_outer', motion.outer)], [full('vector_outer')]),
    toggle('inner_rotor', [ring('inner_rotor', 'vector_inner', motion.inner)], [full('vector_inner')]),
    toggle('sweep', [ring('radar_sweep', 'vector_sweep', motion.sweep)]),
    // Opaque readout apertures keep every rotated mark clear of live information.
    full('vector_shield'), full('vector_frame'), full('vector_bus'), full('vector_latches'),
    toggle('core_glow', [{ kind: 'group', name: 'core_glow', children: [full('vector_pulse')],
      alpha: op('+', 155, op('*', op('sin', op('*', phase(motion.pulse), 2 * Math.PI)), 40)) }], [full('vector_pulse', 155)]),
    toggle('seconds', [{ kind: 'group', name: 'seconds_mark', children: [full('vector_seconds')], angle: op('*', second, 6) }]),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
