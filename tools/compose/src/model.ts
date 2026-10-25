/** Shared design layer: numeric expressions serialize to WFF and evaluate for previews. */

/** Editor switches shared by layout, diagnostics and regression tests. */
export const effects = ['seconds', 'ring_a', 'ring_b', 'breathing', 'nodes', 'scan', 'tilt'] as const;
/** One independently measurable visual effect. */
export type Effect = typeof effects[number];
/** A reproducible preview frame, independent of the computer's clock and locale. */
export interface Frame {
  time: Date; hour24: boolean; battery: number; steps: number;
  palette: 'REFERENCE' | 'PHOSPHOR' | 'ICE'; ambient: boolean;
  redlinePalette?: string; motionSpeed?: 'STILL'|'SLOW'|'STANDARD'|'FAST'; motionStyle?: 'SMOOTH'|'DYNAMIC';
  effects: Record<Effect, boolean>; tiltX: number; tiltY: number; shortcut: string | null;
}
/** Canonical catalogue and picker preview state. Date fields use UTC as a synthetic local clock. */
export function frame(overrides: Partial<Frame> = {}): Frame {
  return { time: new Date('2026-10-24T10:08:36Z'), hour24: true, battery: 80, steps: 8412,
    palette: 'REFERENCE', ambient: false, effects: Object.fromEntries(effects.map(k => [k, true])) as Record<Effect, boolean>,
    tiltX: 0, tiltY: 0, shortcut: null, ...overrides };
}
/** A restricted numeric AST, avoiding separate handwritten WFF and preview formulas. */
export type NumberValue = number | { source: 'second' | 'daySeconds' | 'daySecond' | 'battery' | 'tiltX' | 'tiltY' }
  | { op: '+' | '-' | '*' | '/' | '%' | 'sin' | 'cos' | 'min' | 'max'; a: NumberValue; b?: NumberValue };
/** Construct an arithmetic node. */
export const op = (operator: Exclude<NumberValue, number | {source: string}>['op'], a: NumberValue, b?: NumberValue): NumberValue => ({ op: operator, a, b });
/** Fractional seconds within the minute. */
export const second: NumberValue = { source: 'second' };
/** Fractional local seconds since midnight; bounded phases prevent large sine arguments. */
export const daySeconds: NumberValue = { source: 'daySeconds' };
/** Integer local seconds tick drives bounded one-second transitions without a millisecond dependency. */
export const daySecond: NumberValue = { source: 'daySecond' };
/** Current watch battery percentage. */
export const battery: NumberValue = { source: 'battery' };
/** Evaluate only our known AST; never execute text from diagnostic exports. */
export function value(n: NumberValue, f: Frame): number {
  if (typeof n === 'number') return n;
  if ('source' in n) {
    const t = f.time;
    return ({ second: t.getUTCSeconds() + t.getUTCMilliseconds() / 1000,
      daySeconds: t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds() + t.getUTCMilliseconds() / 1000,
      daySecond: t.getUTCHours()*3600+t.getUTCMinutes()*60+t.getUTCSeconds(),
      battery: f.battery, tiltX: Math.max(-3, Math.min(3, f.tiltX)), tiltY: Math.max(-3, Math.min(3, f.tiltY)) })[n.source];
  }
  const a = value(n.a, f), b = n.b === undefined ? 0 : value(n.b, f);
  switch (n.op) {
    case '+': return a + b; case '-': return a - b; case '*': return a * b;
    case '/': return a / b; case '%': return a % b; case 'sin': return Math.sin(a);
    case 'cos': return Math.cos(a); case 'min': return Math.min(a, b); case 'max': return Math.max(a, b);
  }
}
/** Emit the exact same arithmetic tree for Wear OS. */
export function expression(n: NumberValue): string {
  if (typeof n === 'number') return String(n);
  if ('source' in n) return ({ second: '[SECOND_MILLISECOND]', daySeconds: '([SECONDS_IN_DAY]+[MILLISECOND]/1000)', daySecond: '[SECONDS_IN_DAY]',
    battery: '[BATTERY_PERCENT]', tiltX: '(clamp([ACCELEROMETER_ANGLE_X],-30,30)/10)',
    tiltY: '(clamp([ACCELEROMETER_ANGLE_Y],-30,30)/10)' })[n.source];
  const a = expression(n.a), b = n.b === undefined ? '' : expression(n.b);
  return ['sin','cos','min','max'].includes(n.op) ? `${n.op}(${a}${b ? `,${b}` : ''})` : `(${a}${n.op}${b})`;
}
/** Bounded repeating phase, in radians. */
export const phase = (period: number, offset = 0): NumberValue => op('+', op('*', op('%', daySeconds, period), 2 * Math.PI / period), offset);
/** Named palette entries; all WFF colours refer to these roles. */
export type Role = 'navy' | 'cyan' | 'pale' | 'teal' | 'amber' | 'white' | 'warning';
/** Small rendering tree shared by WFF and SVG backends. */
export interface Shape {
  kind: 'line' | 'rect' | 'circle' | 'arc'; role: Role; alpha?: NumberValue; stroke?: number;
  x?: NumberValue; y?: NumberValue; x2?: number; y2?: number; width?: number; height?: number;
  r?: number; start?: number; end?: NumberValue; warning?: boolean;
  cx?: number; cy?: number;
}
/** A transform applies around the canvas centre in both renderers. */
export interface Group {
  kind: 'group'; name: string; children: Node[]; angle?: NumberValue; scale?: NumberValue;
  x?: NumberValue; y?: NumberValue; gyro?: boolean; alpha?: NumberValue;
  pivot?: { x:number; y:number };
  /** A new target every second re-arms interpolation after activation; repeat loops are never used. */
  angleTransition?: {value:NumberValue;fps:number;direction:'CLOCKWISE'|'COUNTER_CLOCKWISE'};
  alphaTransition?: {value:NumberValue;fps:number};
}
/** Conditional branches remove disabled high-frequency data sources from the active tree. */
export interface Switch { kind: 'switch'; effect: Effect; enabled: Node[]; disabled: Node[] }
/** Readouts use templates; the clock itself uses DigitalClock, not text expressions. */
export interface Label { kind: 'label'; content: 'date' | 'steps' | 'battery' | string; x: number; y: number; width: number; size: number; role: Role; alpha?: NumberValue; align?:'START'|'CENTER'; height?:number; warning?:boolean }
/** A dot-matrix clock is rendered through the platform's time formatting. */
export interface Clock { kind: 'clock'; ambient: boolean }
/** Generated image layer. A monochrome background is tinted by the active palette. */
export interface ImageNode { kind: 'image'; resource: string; alpha: number; role: Role; x?:number; y?:number; width?:number; height?:number; tint?:boolean }
/** Discriminated renderer input. */
export type Node = Shape | Group | Switch | Label | Clock | ImageNode;
/** Per-face styling keeps shared geometry/expression serialization independent of HALO's layout. */
export interface RenderStyle {
  roles: readonly Role[]; palettes: Record<string,Record<Role,string>>;
  clockXml?: (ambient:boolean)=>string; clockSvg?: (f:Frame)=>string;
  labelXml?: Record<string,string>; labelText?: (content:string,f:Frame)=>string;
  imageData?: Record<string,string>;
}
