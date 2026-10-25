/**
 * Core layer: a reproducible preview frame.
 *
 * Previews and tests never read the computer's clock or locale. A frame holds a
 * synthetic time (UTC fields stand in for the watch's local time), the live
 * readings a face can show, and the editor choices as plain setting → option IDs.
 */

/** What the complication provider is showing, for previews only. The watch draws real provider data. */
export type ComplicationPreview =
  | { type: 'EMPTY' }
  | { type: 'SHORT_TEXT'; text: string; icon?: boolean }
  | { type: 'RANGED_VALUE'; text: string; value: number; min: number; max: number }
  | { type: 'MONOCHROMATIC_IMAGE' }
  | { type: 'SMALL_IMAGE' };

/** One still moment of a face, with every input fixed. */
export interface Frame {
  /** Wall-clock time; read through UTC getters as if it were local. */
  time: Date;
  /** The watch's 12/24-hour preference. */
  hour24: boolean;
  battery: number;
  /** Ambient (always-on) rendering instead of interactive. */
  ambient: boolean;
  tiltX: number;
  tiltY: number;
  /** Editor selections: setting ID → option ID. Missing settings use their defaults. */
  config: Record<string, string>;
  complication: ComplicationPreview;
}

/** A canonical frame; tests and previews override only the fields they care about. */
export function frame(overrides: Partial<Frame> = {}): Frame {
  return {
    time: new Date('2026-10-25T10:45:00Z'),
    hour24: true,
    battery: 87,
    ambient: false,
    tiltX: 0,
    tiltY: 0,
    config: {},
    complication: { type: 'EMPTY' },
    ...overrides,
  };
}

/** Format hours and minutes as the watch's TimeText `hh:mm` would, honouring 12/24-hour mode. */
export function clockText(time: Date, hour24: boolean): string {
  const hour = time.getUTCHours();
  const shown = hour24 ? hour : hour % 12 || 12;
  return `${String(shown).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
}
