/**
 * WFF layer: one tappable complication slot and its SVG preview.
 *
 * The watch owns the provider and its tap action; the face only draws what the
 * provider supplies. While empty, the slot shows setup text. No provider component
 * is guessed: the user picks Timer once in the complication editor.
 *
 * Layout inside the slot box (stacked, so a missing icon leaves no hole beside text):
 * - SHORT_TEXT: optional icon on top, text below.
 * - RANGED_VALUE: text above a thin progress bar (a running timer's progress).
 * - MONOCHROMATIC_IMAGE / SMALL_IMAGE: one centred icon.
 */
import type { ComplicationPreview } from '../core/frame.ts';
import { escapeXml, tag } from './xml.ts';

/** Slot placement and look. */
export interface SlotSpec {
  id: number;
  /** Internal name; also the string resource for the editor label. */
  name: string;
  x: number; y: number; width: number; height: number;
  /** Text and icon colour. */
  ink: string;
  /** Colour of the empty-slot prompt and progress track. */
  dim: string;
  /** Prompt shown before a provider is chosen. */
  emptyText: string;
  /** System font family for provider text (provider strings are arbitrary, so no bitmap font). */
  fontFamily: string;
}

/** Vertical layout in slot coordinates, shared by WFF and SVG. */
const metrics = (s: SlotSpec) => ({
  iconSize: 18,
  textY: 20,
  textHeight: s.height - 22,
  textSize: 17,
  barY: s.height - 5,
  bigIcon: Math.min(30, s.height - 8),
});

/** Provider text drawn centred across the slot. */
function textPart(s: SlotSpec, y: number, height: number, size: number, content: string, colour: string): string {
  return tag('PartText', { x: 0, y, width: s.width, height },
    tag('Text', { align: 'CENTER' }, tag('Font', { family: s.fontFamily, size, color: colour }, content)));
}

/** A provider icon at a given box, tinted to the ink colour. */
function iconPart(x: number, y: number, size: number, source: string, tint: string | undefined): string {
  return tag('PartImage', { x, y, width: size, height: size, tintColor: tint }, tag('Image', { resource: source }));
}

/** The complete ComplicationSlot element. Hidden in ambient mode. */
export function slotXml(s: SlotSpec): string {
  const m = metrics(s);
  const providerText = tag('Template', {}, '%s' + tag('Parameter', { expression: '[COMPLICATION.TEXT]' }));
  const empty = textPart(s, (s.height - 22) / 2, 22, 14, escapeXml(s.emptyText), s.dim);
  const shortText =
    iconPart((s.width - m.iconSize) / 2, 0, m.iconSize, '[COMPLICATION.MONOCHROMATIC_IMAGE]', s.ink) +
    textPart(s, m.textY, m.textHeight, m.textSize, providerText, s.ink);
  // Progress fills a thin bar from left to right as (value - min) / (max - min).
  // The live bar starts 1 unit wide (WFF requires a positive width); its Transform sets the real width.
  const progress = '(([COMPLICATION.RANGED_VALUE_VALUE]-[COMPLICATION.RANGED_VALUE_MIN])/max([COMPLICATION.RANGED_VALUE_MAX]-[COMPLICATION.RANGED_VALUE_MIN],1))';
  const bar = (width: string | number, colour: string, live: boolean) => tag('PartDraw', { x: 0, y: m.barY, width: s.width, height: 3 },
    tag('Rectangle', { x: 0, y: 0, width: live ? 1 : width, height: 3 },
      tag('Fill', { color: colour }) + (live ? tag('Transform', { target: 'width', value: `clamp(${progress},0,1)*${s.width}` }) : '')));
  const ranged = textPart(s, 0, m.barY - 2, m.textSize, providerText, s.ink) + bar(s.width, s.dim, false) + bar(0, s.ink, true);
  const big = (source: string, tint?: string) => iconPart((s.width - m.bigIcon) / 2, (s.height - m.bigIcon) / 2, m.bigIcon, source, tint);
  return tag('ComplicationSlot', {
    x: s.x, y: s.y, width: s.width, height: s.height, slotId: s.id, name: s.name, displayName: s.name,
    supportedTypes: 'SHORT_TEXT RANGED_VALUE MONOCHROMATIC_IMAGE SMALL_IMAGE EMPTY', isCustomizable: 'TRUE',
  },
    tag('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }) +
    tag('DefaultProviderPolicy', { defaultSystemProvider: 'EMPTY', defaultSystemProviderType: 'EMPTY' }) +
    tag('BoundingBox', { x: 0, y: 0, width: s.width, height: s.height }) +
    tag('Complication', { type: 'EMPTY' }, empty) +
    tag('Complication', { type: 'SHORT_TEXT' }, shortText) +
    tag('Complication', { type: 'RANGED_VALUE' }, ranged) +
    tag('Complication', { type: 'MONOCHROMATIC_IMAGE' }, big('[COMPLICATION.MONOCHROMATIC_IMAGE]', s.ink)) +
    tag('Complication', { type: 'SMALL_IMAGE' }, big('[COMPLICATION.SMALL_IMAGE]')));
}

/** A simple stand-in icon (an hourglass) for previews; the watch shows the provider's own icon. */
function previewIcon(x: number, y: number, size: number, colour: string): string {
  const k = size / 18;
  return `<path transform="translate(${x},${y}) scale(${k})" d="M4 1H14V4L10 9L14 14V17H4V14L8 9L4 4Z" fill="none" stroke="${colour}" stroke-width="1.6"/>`;
}

/** Preview of the slot for one provider state. Approximates system text rendering. */
export function slotSvg(s: SlotSpec, c: ComplicationPreview): string {
  const m = metrics(s);
  const text = (y: number, size: number, content: string, colour: string) =>
    `<text x="${s.width / 2}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="${size}" fill="${colour}">${escapeXml(content)}</text>`;
  let body: string;
  switch (c.type) {
    case 'EMPTY': body = text(s.height / 2, 14, s.emptyText, s.dim); break;
    case 'SHORT_TEXT':
      body = (c.icon ? previewIcon((s.width - m.iconSize) / 2, 0, m.iconSize, s.ink) : '') + text(m.textY + m.textHeight / 2, m.textSize, c.text, s.ink);
      break;
    case 'RANGED_VALUE': {
      const fraction = Math.max(0, Math.min(1, (c.value - c.min) / Math.max(c.max - c.min, 1)));
      body = text((m.barY - 2) / 2, m.textSize, c.text, s.ink)
        + `<rect x="0" y="${m.barY}" width="${s.width}" height="3" fill="${s.dim}"/><rect x="0" y="${m.barY}" width="${s.width * fraction}" height="3" fill="${s.ink}"/>`;
      break;
    }
    case 'MONOCHROMATIC_IMAGE':
    case 'SMALL_IMAGE':
      body = previewIcon((s.width - m.bigIcon) / 2, (s.height - m.bigIcon) / 2, m.bigIcon, s.ink);
  }
  return `<g transform="translate(${s.x},${s.y})">${body}</g>`;
}
