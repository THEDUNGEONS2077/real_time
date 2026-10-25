/**
 * Core layer: the numeric expression tree behind every moving property.
 *
 * One tree is written once in a face's design. It is serialized to a WFF
 * expression for the watch (`expression`) and evaluated in TypeScript for SVG
 * previews and tests (`value`). This keeps the watch and the previews driven by
 * exactly the same maths.
 */
import type { Frame } from './frame.ts';

/** Live inputs the watch supplies. Each maps to one WFF data source. */
export type Source =
  | 'second'      // fractional seconds within the minute
  | 'daySeconds'  // fractional local seconds since midnight
  | 'daySecond'   // whole local seconds since midnight (ticks once per second)
  | 'battery'     // battery percentage
  | 'tiltX'       // wrist tilt, clamped to ±3
  | 'tiltY';

/** Operators the serializer and evaluator both understand. Nothing else is accepted. */
export type Operator = '+' | '-' | '*' | '/' | '%' | 'sin' | 'cos' | 'min' | 'max';

/** A constant, a live source, or an operation on one or two sub-trees. */
export type NumberValue =
  | number
  | { source: Source }
  | { op: Operator; a: NumberValue; b?: NumberValue };

/** Build an operation node. `sin`/`cos` use only `a`. */
export const op = (operator: Operator, a: NumberValue, b?: NumberValue): NumberValue => ({ op: operator, a, b });

/** Fractional seconds within the minute; drives the seconds beacon. */
export const second: NumberValue = { source: 'second' };
/** Fractional seconds since local midnight; drives continuous rotation. */
export const daySeconds: NumberValue = { source: 'daySeconds' };
/** Whole seconds since local midnight; refreshes one-second interpolation targets. */
export const daySecond: NumberValue = { source: 'daySecond' };
/** Watch battery percentage. */
export const battery: NumberValue = { source: 'battery' };
/** Wrist tilt in the range ±3, derived from the accelerometer. */
export const tiltX: NumberValue = { source: 'tiltX' };
/** Wrist tilt in the range ±3, derived from the accelerometer. */
export const tiltY: NumberValue = { source: 'tiltY' };

/** True when a value is a plain constant, so it can be written as a static attribute. */
export const isConstant = (n: NumberValue | undefined): n is number => typeof n === 'number';

/** Read one live source from a synthetic preview frame. UTC fields stand in for local time. */
function sourceValue(source: Source, f: Frame): number {
  const t = f.time;
  const wholeDay = t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds();
  switch (source) {
    case 'second': return t.getUTCSeconds() + t.getUTCMilliseconds() / 1000;
    case 'daySeconds': return wholeDay + t.getUTCMilliseconds() / 1000;
    case 'daySecond': return wholeDay;
    case 'battery': return f.battery;
    case 'tiltX': return Math.max(-3, Math.min(3, f.tiltX));
    case 'tiltY': return Math.max(-3, Math.min(3, f.tiltY));
  }
}

/** Evaluate a tree for a preview frame. Only this known AST is interpreted; no text is ever executed. */
export function value(n: NumberValue, f: Frame): number {
  if (typeof n === 'number') return n;
  if ('source' in n) return sourceValue(n.source, f);
  const a = value(n.a, f);
  const b = n.b === undefined ? 0 : value(n.b, f);
  switch (n.op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case '%': return a % b;
    case 'sin': return Math.sin(a);
    case 'cos': return Math.cos(a);
    case 'min': return Math.min(a, b);
    case 'max': return Math.max(a, b);
  }
}

/** WFF spelling of each live source. Tilt is clamped to ±30° and scaled to ±3. */
const wffSource: Record<Source, string> = {
  second: '[SECOND_MILLISECOND]',
  daySeconds: '([SECONDS_IN_DAY]+[MILLISECOND]/1000)',
  daySecond: '[SECONDS_IN_DAY]',
  battery: '[BATTERY_PERCENT]',
  tiltX: '(clamp([ACCELEROMETER_ANGLE_X],-30,30)/10)',
  tiltY: '(clamp([ACCELEROMETER_ANGLE_Y],-30,30)/10)',
};

/** Serialize the same tree as a WFF expression string. */
export function expression(n: NumberValue): string {
  if (typeof n === 'number') return String(n);
  if ('source' in n) return wffSource[n.source];
  const a = expression(n.a);
  const b = n.b === undefined ? '' : expression(n.b);
  if (n.op === 'sin' || n.op === 'cos' || n.op === 'min' || n.op === 'max') return `${n.op}(${a}${b ? `,${b}` : ''})`;
  return `(${a}${n.op}${b})`;
}

/** True when a tree reads any live source; used to prove Still mode is truly static. */
export function readsSource(n: NumberValue | undefined): boolean {
  if (n === undefined || typeof n === 'number') return false;
  if ('source' in n) return true;
  return readsSource(n.a) || readsSource(n.b);
}
