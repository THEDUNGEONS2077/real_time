/**
 * REACTOR design: titanium containment hardware, amber energy and red accents.
 * A fixed armoured clock bridge masks the rotating machinery behind it. Shared
 * NEXUS/JARVIS packing, explicit colours and flat controls preserve the baseline.
 */
import { daySeconds, op, second } from '../../src/core/expr.ts';
import type { NumberValue } from '../../src/core/expr.ts';
import type { Group, ImageNode, Node, Palette, Role } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';

/** The neutral chassis stays titanium; only energy, accents and text change hue. */
function palette(accent: string, secondary: string, ink: string): Palette {
  return { ground: '#080b0e', accent, accentDeep: secondary, ink, line: '#4c5158', warning: '#ff745c' };
}

/** Six explicit energy palettes, with Ember as the authored amber/red design. */
export const palettes = {
  EMBER: palette('#ffc15a', '#ed5546', '#fff0d4'),
  ICE: palette('#89dfff', '#4b8df5', '#e5faff'),
  PHOSPHOR: palette('#83e6a5', '#36a18d', '#e5ffec'),
  BLOOD: palette('#ff6371', '#d89550', '#ffe6e9'),
  VIOLET: palette('#c39aff', '#dd5b9b', '#f1eaff'),
  STEEL: palette('#d7e1e8', '#e6a951', '#f0f4f7'),
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
export const motion = { outer: 40, inner: -60, sweep: 30, pulse: 12 } as const;
/** Independent optional carriers, enabled by default. */
export const effects = ['outer_rotor', 'inner_rotor', 'sweep', 'core_glow', 'seconds'] as const;
/** One optional effect. */
export type EffectId = typeof effects[number];
/** Face-specific control labels. */
export const effectLabels: Record<EffectId, string> = {
  outer_rotor: 'ENERGY ROTOR', inner_rotor: 'CONTAINMENT RING', sweep: 'CHARGE SWEEP',
  core_glow: 'CORE PULSE', seconds: 'SECONDS MARK',
};
/** Retain the accepted JARVIS clock sizing and fixed readout positions. */
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
  reactor_shell: { role: 'ground' }, reactor_steel: { role: 'line' }, reactor_bezel: { role: 'accent' },
  reactor_outer: { role: 'accent' }, reactor_inner: { role: 'accentDeep' },
  reactor_shield: { role: 'ground' }, reactor_frame: { role: 'line' },
  reactor_bus: { role: 'accent' }, reactor_latches: { role: 'accentDeep' },
  reactor_pulse: { role: 'accent' }, reactor_sweep: { role: 'accent' }, reactor_seconds: { role: 'ink' },
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
    full('reactor_shell'), full('reactor_steel'), full('reactor_bezel'),
    toggle('outer_rotor', [ring('outer_rotor', 'reactor_outer', motion.outer)], [full('reactor_outer')]),
    toggle('inner_rotor', [ring('inner_rotor', 'reactor_inner', motion.inner)], [full('reactor_inner')]),
    toggle('sweep', [ring('radar_sweep', 'reactor_sweep', motion.sweep)]),
    // Opaque metal shields keep every rotated mark clear of live information.
    full('reactor_shield'), full('reactor_frame'), full('reactor_bus'), full('reactor_latches'),
    toggle('core_glow', [{ kind: 'group', name: 'core_glow', children: [full('reactor_pulse')],
      alpha: op('+', 155, op('*', op('sin', op('*', phase(motion.pulse), 2 * Math.PI)), 40)) }], [full('reactor_pulse', 155)]),
    toggle('seconds', [{ kind: 'group', name: 'seconds_mark', children: [full('reactor_seconds')], angle: op('*', second, 6) }]),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
