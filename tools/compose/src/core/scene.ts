/**
 * Core layer: the decorative scene tree shared by the WFF and SVG backends.
 *
 * A face describes its rings, ticks and masks once as these nodes. Time,
 * readouts and complications are not scene nodes: each face composes them as
 * separate fixed layers, so moving decoration never re-draws text.
 */
import type { NumberValue } from './expr.ts';

/**
 * Semantic colour slots. A palette maps each one to a literal colour.
 * - ground: the background disc behind the readouts
 * - accent / accentDeep: the palette's bright and dark hue
 * - ink / line: neutral light text-like marks and quiet graphite lines
 * - warning: low-battery colour
 */
export type Role = 'ground' | 'accent' | 'accentDeep' | 'ink' | 'line' | 'warning';

/** A palette assigns a literal colour to every role. Literals avoid runtime theme lookups on the watch. */
export type Palette = Record<Role, string>;

/** A stroked or filled primitive. Coordinates are in the 432-unit watch canvas. */
export interface Shape {
  kind: 'line' | 'rect' | 'circle' | 'arc';
  role: Role;
  /** 0–255. A tree here makes the opacity live. */
  alpha?: NumberValue;
  /** Stroke width. Omitted means filled. */
  stroke?: number;
  x?: number; y?: number; x2?: number; y2?: number;
  width?: number; height?: number;
  /** Radius for circles and arcs. */
  r?: number;
  /** Arc angles in degrees, clockwise from twelve. */
  start?: number; end?: number;
  /** Arc centre; defaults to the canvas centre. */
  cx?: number; cy?: number;
}

/** A one-second linear move to a target that is refreshed by the clock every second. */
export interface Transition {
  value: NumberValue;
  /** Requested frame rate. Delivery is up to the watch. */
  fps: number;
  /** Rotation direction across the 360° wrap; omitted for non-angle targets. */
  direction?: 'CLOCKWISE' | 'COUNTER_CLOCKWISE';
}

/** A group of children that move together around the canvas centre. */
export interface Group {
  kind: 'group';
  name: string;
  children: Node[];
  angle?: NumberValue;
  x?: NumberValue;
  y?: NumberValue;
  alpha?: NumberValue;
  /** Drive x/y from the accelerometer through WFF's Gyro element. */
  gyro?: boolean;
  /** Smooth mode: interpolate angle/alpha toward clock-refreshed targets. */
  angleTransition?: Transition;
  alphaTransition?: Transition;
}

/** An editor ON/OFF effect. `on` renders when the setting is TRUE, `off` otherwise. */
export interface Switch {
  kind: 'switch';
  setting: string;
  on: Node[];
  off: Node[];
}

/** A white mask image, tinted by its role (or drawn as-is when `tint` is false). */
export interface ImageNode {
  kind: 'image';
  resource: string;
  role: Role;
  alpha: number;
  x?: number; y?: number; width?: number; height?: number;
  tint?: boolean;
}

/** A single image with direct transforms, avoiding an intermediate opacity group. */
export interface Sprite {
  kind: 'sprite';
  name: string;
  resource: string;
  role: Role;
  x: number; y: number; width: number; height: number;
  alpha: NumberValue;
  offsetX?: NumberValue;
  offsetY?: NumberValue;
  angle?: NumberValue;
  pivotX: number;
  pivotY: number;
  tint?: boolean;
}

/** Any scene node. */
export type Node = Shape | Group | Switch | ImageNode | Sprite;

/** True for the four primitive kinds. */
export const isShape = (n: Node): n is Shape => n.kind === 'line' || n.kind === 'rect' || n.kind === 'circle' || n.kind === 'arc';

/** Resolve every switch to its OFF branch, recursively. Used for Still mode and static poses. */
export function stillNodes(nodes: Node[]): Node[] {
  return nodes.flatMap(n => {
    if (n.kind === 'switch') return stillNodes(n.off);
    if (n.kind === 'group') return [{ ...n, children: stillNodes(n.children) }];
    return [n];
  });
}

/** Resolve switches against editor choices, keeping groups. Used by previews and tests. */
export function selectNodes(nodes: Node[], config: Record<string, string>): Node[] {
  return nodes.flatMap(n => {
    if (n.kind === 'switch') return selectNodes(config[n.setting] === 'FALSE' ? n.off : n.on, config);
    if (n.kind === 'group') return [{ ...n, children: selectNodes(n.children, config) }];
    return [n];
  });
}
