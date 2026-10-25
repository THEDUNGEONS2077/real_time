/** CIPHER mask layer: the SVG source of every mask image, by resource name. */
import { arcSegmentsSvg, arcTrackSvg, bezelSvg, codeRingSvg, rainSvg, secondsSvg, slotFrameSvg, sweepSvg } from './assets.ts';
import { layout, rain } from './design.ts';

/** Every mask's SVG source, by resource name. */
export function maskSvgs(): Record<string, string> {
  const { x, y, width, height } = layout.complication;
  return {
    cipher_outer_code: codeRingSvg(186, 72, 11, 2077),
    cipher_inner_code: codeRingSvg(154, 60, 8.5, 1999),
    cipher_arc_track: arcTrackSvg(),
    cipher_arc_segments: arcSegmentsSvg(),
    cipher_sweep: sweepSvg(),
    cipher_bezel: bezelSvg(),
    cipher_seconds: secondsSvg(),
    cipher_slot_frame: slotFrameSvg(x, y, width, height),
    ...Object.fromEntries(rain.map((c, i) => [`cipher_rain_${i}`, rainSvg(c.seed)])),
  };
}

