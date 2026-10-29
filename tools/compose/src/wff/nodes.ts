/**
 * WFF layer: serialize scene nodes as Watch Face Format 4 elements.
 *
 * Colours are always written as literals from the active palette. REDLINE 0.1.0
 * turned white on the watch with theme-colour lookups; literals fixed it, so the
 * backend never emits `[CONFIGURATION.*]` colour references.
 */
import type { NumberValue } from '../core/expr.ts';
import { expression, isConstant, op } from '../core/expr.ts';
import type { Node, Palette, Shape, Transition } from '../core/scene.ts';
import { isShape } from '../core/scene.ts';
import { canvas, condition, tag } from './xml.ts';

/** A Transform for a live property; constants need no Transform. */
function transform(target: string, n: NumberValue | undefined): string {
  return n !== undefined && !isConstant(n) ? tag('Transform', { target, value: expression(n) }) : '';
}

/**
 * A one-second LINEAR interpolation toward a clock-refreshed target.
 * repeat=0 is deliberate: REDLINE 0.2.0's infinite loops stopped after a face
 * switch. A fresh target every second restarts the move without a loop.
 */
function transition(target: string, t: Transition): string {
  const animation = tag('Animation', { duration: 1, interpolation: 'LINEAR', fps: t.fps, repeat: 0, angleDirection: t.direction });
  return tag('Transform', { target, value: expression(t.value) }, animation);
}

/** Static attribute value: the constant itself, or a neutral start value for a live property. */
const initial = (n: NumberValue | undefined, fallback: number): number => (isConstant(n) ? n : fallback);

/** One primitive inside a PartDraw. */
function shapeXml(n: Shape, colour: string): string {
  const paint = n.stroke ? tag('Stroke', { color: colour, thickness: n.stroke }) : tag('Fill', { color: colour });
  let element: string;
  switch (n.kind) {
    case 'line':
      element = tag('Line', { startX: n.x ?? 0, startY: n.y ?? 0, endX: n.x2, endY: n.y2 }, paint);
      break;
    case 'rect':
      element = tag('Rectangle', { x: n.x ?? 0, y: n.y ?? 0, width: n.width, height: n.height }, paint);
      break;
    case 'circle': {
      const r = n.r ?? 0;
      element = tag('Ellipse', { x: (n.x ?? 0) - r, y: (n.y ?? 0) - r, width: 2 * r, height: 2 * r }, paint);
      break;
    }
    case 'arc': {
      const r = n.r ?? 0;
      element = tag('Arc', { centerX: n.cx ?? 216, centerY: n.cy ?? 216, width: 2 * r, height: 2 * r, startAngle: n.start, endAngle: n.end }, paint);
      break;
    }
  }
  return tag('PartDraw', { ...canvas, alpha: initial(n.alpha, 255) }, transform('alpha', n.alpha) + element);
}

/** Serialize one node (and its children) with the given palette. */
export function nodeXml(n: Node, palette: Palette): string {
  if (isShape(n)) return shapeXml(n, palette[n.role]);
  switch (n.kind) {
    case 'sprite': {
      const x = n.offsetX === undefined ? '' : transform('x', op('+', n.x, n.offsetX));
      const y = n.offsetY === undefined ? '' : transform('y', op('+', n.y, n.offsetY));
      return tag('PartImage', {
        name: n.name, x: n.x, y: n.y, width: n.width, height: n.height,
        pivotX: n.pivotX, pivotY: n.pivotY, angle: initial(n.angle, 0),
        alpha: initial(n.alpha, 255), tintColor: n.tint === false ? undefined : palette[n.role],
      }, x + y + transform('angle', n.angle) + transform('alpha', n.alpha)
        + tag('Image', { resource: n.resource }));
    }
    case 'switch':
      // Disabled effects select a static subtree, so no live expression keeps running behind alpha 0.
      return condition(
        [{ when: `[CONFIGURATION.${n.setting}] == "TRUE"`, then: n.on.map(c => nodeXml(c, palette)).join('') }],
        n.off.map(c => nodeXml(c, palette)).join(''),
      );
    case 'group': {
      // Gyro owns x/y when tilt is on; otherwise x/y are ordinary Transforms.
      const gyro = n.gyro ? tag('Gyro', { x: expression(n.x ?? 0), y: expression(n.y ?? 0) }) : '';
      const position = n.gyro ? '' : transform('x', n.x) + transform('y', n.y);
      const angle = n.angleTransition ? transition('angle', n.angleTransition) : transform('angle', n.angle);
      const alpha = n.alphaTransition ? transition('alpha', n.alphaTransition) : transform('alpha', n.alpha);
      const attrs = {
        ...canvas, name: n.name,
        x: initial(n.x, 0), y: initial(n.y, 0), angle: initial(n.angle, 0),
        scaleX: 1, scaleY: 1, alpha: initial(n.alpha, 255), pivotX: 0.5, pivotY: 0.5,
      };
      return tag('Group', attrs, gyro + position + angle + alpha + n.children.map(c => nodeXml(c, palette)).join(''));
    }
    case 'image': {
      const attrs = {
        ...canvas,
        x: Math.round(n.x ?? 0), y: Math.round(n.y ?? 0), width: n.width ?? 432, height: n.height ?? 432,
        alpha: n.alpha, tintColor: n.tint === false ? undefined : palette[n.role],
      };
      return tag('PartImage', attrs, tag('Image', { resource: n.resource }));
    }
  }
}
