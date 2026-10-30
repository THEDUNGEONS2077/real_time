/**
 * JARVIS design: concentric cyan instruments around a stationary readable core.
 * Independent watch-native artwork inspired by the supplied JARVIS.png. The
 * accepted NEXUS packing/editor architecture bounds runtime and preview work.
 */
import { daySeconds, op, second } from '../../src/core/expr.ts';
import type { NumberValue } from '../../src/core/expr.ts';
import type { Group, ImageNode, Node, Palette, Role } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';

/** Explicit colours feed the artwork, previews and typed editor colour selection. */
function palette(accent: string, secondary: string, ink: string, line: string): Palette {
  return { ground: '#000000', accent, accentDeep: secondary, ink, line, warning: '#ff745c' };
}

/** Cyan matches the reference; alternatives preserve the same contrast hierarchy. */
export const palettes = {
  CYAN: palette('#59cbd1', '#288c9d', '#dcfcff', '#24535d'),
  ICE: palette('#8be8ff', '#548dbb', '#ecfcff', '#304b62'),
  AMBER: palette('#ffc35b', '#ad6f25', '#fff0d4', '#584321'),
  PHOSPHOR: palette('#65edaa', '#267c69', '#e1ffed', '#254c3c'),
  BLOOD: palette('#ff5a68', '#953750', '#ffe6e9', '#582d39'),
  VIOLET: palette('#be9aff', '#6f57ab', '#f1eaff', '#45345f'),
} satisfies Record<string, Palette>;
/** Stable palette IDs. */
export type PaletteId = keyof typeof palettes;
/** Still removes decorative time dependencies; remaining values scale decoration. */
export const speeds = { STILL: 0, SLOW: 0.5, STANDARD: 1, FAST: 2 } as const;
/** Stable speed IDs. */
export type Speed = keyof typeof speeds;
/** Accessible speed descriptions. */
export const speedLabels: Record<Speed, string> = {
  STILL: 'STILL', SLOW: 'SLOW · 0.5×', STANDARD: 'STANDARD · 1×', FAST: 'FAST · 2×',
};
/** Every period divides the local day at every moving speed. */
export const motion = { outer: 30, inner: -48, sweep: 24, pulse: 8 } as const;
/** Optional moving carriers; all enabled by default. */
export const effects = ['outer_rotor', 'inner_rotor', 'sweep', 'core_glow', 'seconds'] as const;
/** One independent effect ID. */
export type EffectId = typeof effects[number];
/** Names shown on the phone and watch. */
export const effectLabels: Record<EffectId, string> = {
  outer_rotor: 'OUTER TURBINE', inner_rotor: 'INNER INDEX', sweep: 'RADAR SWEEP',
  core_glow: 'CORE LIGHT', seconds: 'SECONDS MARK',
};
/** Keep even the widest large clock clear of the circular opening. */
export const clockScale = 0.85;
/** Fixed information rows and touch target inside the ring structure. */
export const layout = {
  margin: 6, innerRadius: 174,
  date: { x: 96, y: 112, width: 240, height: 28 },
  battery: { x: 176, y: 282, width: 80, height: 24 },
  complication: { x: 156, y: 315, width: 120, height: 44 },
} as const;

/** All geometry is rasterized once; palette tints stay cheap and explicit. */
export const masks: Record<string, { role: Role }> = {
  jarvis_grid: { role: 'line' }, jarvis_bezel: { role: 'accentDeep' },
  jarvis_outer: { role: 'accent' }, jarvis_inner: { role: 'accentDeep' },
  jarvis_core: { role: 'accent' }, jarvis_pulse: { role: 'accent' },
  jarvis_sweep: { role: 'accent' }, jarvis_seconds: { role: 'ink' },
};

/** A white alpha mask in the shared coordinate system. */
function full(resource: string, alpha = 255): ImageNode {
  return { kind: 'image', resource, role: masks[resource].role, alpha };
}

/** An OFF branch contains its reference pose, without hidden live expressions. */
function toggle(setting: EffectId, on: Node[], off: Node[] = []): Node {
  return { kind: 'switch', setting, on, off };
}

/** Same decorative geometry and expressions drive WFF, previews and motion tests. */
export function scene(speed: Speed = 'SLOW'): Node[] {
  const clock = op('*', daySeconds, speeds[speed] || 1);
  const phase = (period: number): NumberValue => op('/', op('%', clock, period), period);
  const turn = (period: number): NumberValue => op('*', phase(Math.abs(period)), period < 0 ? -360 : 360);
  const ring = (name: string, resource: string, period: number): Group =>
    ({ kind: 'group', name, children: [full(resource)], angle: turn(period) });
  const nodes: Node[] = [
    full('jarvis_grid'), full('jarvis_bezel'),
    toggle('outer_rotor', [ring('outer_rotor', 'jarvis_outer', motion.outer)], [full('jarvis_outer')]),
    toggle('inner_rotor', [ring('inner_rotor', 'jarvis_inner', motion.inner)], [full('jarvis_inner')]),
    toggle('sweep', [ring('radar_sweep', 'jarvis_sweep', motion.sweep)]),
    full('jarvis_core'),
    toggle('core_glow', [{ kind: 'group', name: 'core_glow', children: [full('jarvis_pulse')],
      alpha: op('+', 155, op('*', op('sin', op('*', phase(motion.pulse), 2 * Math.PI)), 40)) }], [full('jarvis_pulse', 155)]),
    toggle('seconds', [{ kind: 'group', name: 'seconds_mark', children: [full('jarvis_seconds')], angle: op('*', second, 6) }]),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
