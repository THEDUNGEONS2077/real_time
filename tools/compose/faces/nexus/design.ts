/**
 * NEXUS design: a dual-colour command deck with a fixed, bevelled clock console.
 * Artwork is baked into masks; only six optional effects read the live clock.
 * No wallpaper engine, procedural shader or animation loop runs on the watch.
 */
import { daySeconds, op, second } from '../../src/core/expr.ts';
import type { NumberValue } from '../../src/core/expr.ts';
import type { Group, ImageNode, Node, Palette, Role } from '../../src/core/scene.ts';
import { stillNodes } from '../../src/core/scene.ts';

/** NEXUS uses accentDeep as a second hue, rather than a darker primary hue. */
function palette(accent: string, secondary: string, ink: string, line: string, warning = '#ff604a'): Palette {
  return { ground: '#000000', accent, accentDeep: secondary, ink, line, warning };
}

/** HALO's cyan/amber leads the Cyberdeck-inspired two-tone palette collection. */
export const palettes = {
  FUSION: palette('#6fd0e6', '#f4b942', '#e6f6fa', '#376574'),
  PHOSPHOR: palette('#39ff14', '#1d7f8f', '#d0ffce', '#28623c'),
  AMBER: palette('#ffb000', '#2a8a9a', '#ffe8be', '#765426'),
  ICE: palette('#1ee8ff', '#7656ff', '#d4faff', '#275a73'),
  NEON: palette('#ff3fdc', '#3a6bff', '#ffe0f8', '#743567'),
  BLOOD: palette('#ff3040', '#1f6894', '#ffe0e3', '#71333f', '#ffca64'),
  SYNTH: palette('#ff3d8b', '#2fb8b4', '#ffe0ec', '#703b58'),
  OUTRUN: palette('#ff3e7f', '#3a8dff', '#ffd75e', '#693b69'),
} satisfies Record<string, Palette>;
/** Stable palette option IDs. */
export type PaletteId = keyof typeof palettes;

/** STILL selects static branches; the remaining values scale decorative time. */
export const speeds = { STILL: 0, SLOW: 0.5, STANDARD: 1, FAST: 2 } as const;
/** Stable speed option IDs. */
export type Speed = keyof typeof speeds;
/** Labels include the actual multipliers. */
export const speedLabels: Record<Speed, string> = {
  STILL: 'STILL', SLOW: 'SLOW · 0.5×', STANDARD: 'STANDARD · 1×', FAST: 'FAST · 2×',
};
/** Periods divide a day at every speed, so midnight never changes the motion phase. */
export const motion = { rotor: 24, code: -96, sweep: 18, packet: 8, glow: 16 } as const;
/** Independent effect IDs, retained across updates. */
export const effects = ['outer_rotor', 'code_orbit', 'data_flow', 'sweep', 'glass_glow', 'seconds'] as const;
/** One effect ID. */
export type EffectId = typeof effects[number];
/** Accessible labels used on the phone and watch. */
export const effectLabels: Record<EffectId, string> = {
  outer_rotor: 'MECHANICAL RING', code_orbit: 'CODE ORBIT', data_flow: 'CIRCUIT SIGNALS',
  sweep: 'BEZEL SWEEP', glass_glow: 'GLASS LIGHT', seconds: 'SECONDS MARK',
};

/** Clock scale leaves clearance to the bevel even with the widest font at Large. */
export const clockScale = 0.90;
/** Fixed readouts stay inside the console; none inherits decorative transforms. */
export const layout = {
  margin: 6,
  innerRadius: 174,
  date: { x: 96, y: 112, width: 240, height: 28 },
  battery: { x: 176, y: 282, width: 80, height: 24 },
  complication: { x: 156, y: 315, width: 120, height: 44 },
} as const;

/** Mask tint roles. Alpha, edge softness and internal detail are baked once. */
export const masks: Record<string, { role: Role }> = {
  nexus_bezel: { role: 'line' },
  nexus_rotor: { role: 'accent' },
  nexus_code: { role: 'accentDeep' },
  nexus_circuit: { role: 'accent' },
  nexus_horizon: { role: 'accentDeep' },
  nexus_panel: { role: 'ground' },
  nexus_frame: { role: 'accent' },
  nexus_facets: { role: 'accentDeep' },
  nexus_sweep: { role: 'accent' },
  nexus_seconds: { role: 'ink' },
  nexus_packet: { role: 'accent' },
};

/** A tinted mask placed on the common 432-unit canvas. */
function full(resource: string, alpha = 255): ImageNode {
  return { kind: 'image', resource, role: masks[resource].role, alpha };
}

/** Select static artwork when an effect is off, removing its live dependencies. */
function toggle(setting: EffectId, on: Node[], off: Node[] = []): Node {
  return { kind: 'switch', setting, on, off };
}

/** Decorative scene shared by WFF generation, previews and motion-bound tests. */
export function scene(speed: Speed = 'SLOW'): Node[] {
  const clock = op('*', daySeconds, speeds[speed] || 1);
  const phase = (period: number, offset = 0): NumberValue =>
    op('/', op('%', op('+', clock, period * offset), period), period);
  const turn = (period: number): NumberValue => op('*', phase(Math.abs(period)), period < 0 ? -360 : 360);
  const ring = (name: string, resource: string, period: number): Group =>
    ({ kind: 'group', name, children: [full(resource)], angle: turn(period) });

  // Two tiny signal images travel only along straight circuit runs. Both ends
  // fade to zero, hiding the wrap without a repeating Animation or offscreen work.
  const packets: Node[] = [0, 1].map(i => {
    const p = phase(motion.packet, i * 0.5);
    return {
      kind: 'group', name: `packet_${i}`,
      y: op('*', i ? op('-', 1, p) : p, 76),
      alpha: op('*', op('sin', op('*', p, Math.PI)), 230),
      children: [{ kind: 'image', resource: 'nexus_packet', role: i ? 'accentDeep' : 'accent',
        alpha: 255, x: i ? 370 : 56, y: 168, width: 6, height: 14 }],
    } as Group;
  });
  const nodes: Node[] = [
    full('nexus_bezel'),
    toggle('outer_rotor', [ring('outer_rotor', 'nexus_rotor', motion.rotor)], [full('nexus_rotor')]),
    toggle('code_orbit', [ring('code_orbit', 'nexus_code', motion.code)], [full('nexus_code')]),
    toggle('sweep', [ring('bezel_sweep', 'nexus_sweep', motion.sweep)]),
    toggle('seconds', [{ kind: 'group', name: 'seconds_mark', children: [full('nexus_seconds')], angle: op('*', second, 6) }]),
    // An opaque console masks the orbit behind the time; its readouts stay fixed.
    full('nexus_panel'),
    full('nexus_horizon'),
    full('nexus_circuit'),
    full('nexus_frame'),
    toggle('glass_glow', [{ kind: 'group', name: 'glass_glow', children: [full('nexus_facets')],
      alpha: op('+', 155, op('*', op('sin', op('*', phase(motion.glow), 2 * Math.PI)), 60)) }], [full('nexus_facets', 155)]),
    toggle('data_flow', packets),
  ];
  return speed === 'STILL' ? stillNodes(nodes) : nodes;
}
