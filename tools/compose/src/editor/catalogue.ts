/**
 * Editor layer: the settings catalogue shared by Galaxy Wearable and the on-watch editor.
 *
 * Rules learned on the watch (REDLINE 0.2.0 → 0.2.1):
 * - Declarations stay flat under UserConfigurations. Scene branches use
 *   Conditions only. Native selectors nested through groups left the editors blank.
 * - Every setting and option has a real packaged icon and accessible labels.
 *   Companion apps may show icons without text, so icons carry a caption.
 * - Binary effects are explicit ON/OFF list tiles with stable TRUE/FALSE values.
 */
import { condition, tag } from '../wff/xml.ts';

/** One option tile. `art` replaces the default arc artwork in the icon (used to show fonts). */
export interface EditorOption { id: string; label: string; icon: string; caption: string; colour: string; art?: string }

/** One editor setting with its options and default. */
export interface EditorSetting { id: string; label: string; defaultValue: string; options: EditorOption[] }

/** Deterministic icon resource name, independent of display labels. */
export const optionIcon = (setting: string, option: string): string => `editor_${setting}_${option.toLowerCase()}`;

/** Build a list setting. Option icon names are derived from the IDs. */
export function setting(id: string, label: string, defaultValue: string, options: Omit<EditorOption, 'icon'>[]): EditorSetting {
  if (!options.some(o => o.id === defaultValue)) throw new Error(`Default ${defaultValue} is not an option of ${id}`);
  return { id, label, defaultValue, options: options.map(o => ({ ...o, icon: optionIcon(id, o.id) })) };
}

/** An ON/OFF effect, defaulting to ON. Values stay TRUE/FALSE for compatibility with saved choices. */
export function toggleSetting(id: string, label: string, colour: string): EditorSetting {
  return setting(id, label, 'TRUE', [
    { id: 'TRUE', label: 'ON', caption: 'ON', colour },
    { id: 'FALSE', label: 'OFF', caption: 'OFF', colour: '#87909a' },
  ]);
}

/** String resource name for an option's label. */
const optionLabel = (s: EditorSetting, o: EditorOption) => `${s.id}_${o.id.toLowerCase()}`;

/** The flat UserConfigurations content. */
export function configurationXml(settings: EditorSetting[]): string {
  return settings.map(s => {
    const options = s.options.map(o => tag('ListOption', { id: o.id, displayName: optionLabel(s, o), screenReaderText: optionLabel(s, o), icon: o.icon })).join('');
    const icon = s.options.find(o => o.id === s.defaultValue)!.icon;
    return tag('ListConfiguration', { id: s.id, displayName: s.id, screenReaderText: s.id, icon, defaultValue: s.defaultValue }, options);
  }).join('');
}

/**
 * Pick one scene branch per option using a Condition. The default option is the
 * fallback, so a missing or unknown saved value still renders the default.
 */
export function selectXml(s: EditorSetting, branches: Record<string, string>): string {
  for (const o of s.options) if (branches[o.id] === undefined) throw new Error(`Missing scene branch ${s.id}.${o.id}`);
  const cases = s.options
    .filter(o => o.id !== s.defaultValue)
    .map(o => ({ when: `[CONFIGURATION.${s.id}] == "${o.id}"`, then: branches[o.id] }));
  return condition(cases, branches[s.defaultValue]);
}

/** Display and screen-reader strings for every setting and option. */
export function editorStrings(settings: EditorSetting[]): Record<string, string> {
  return Object.fromEntries(settings.flatMap(s => [[s.id, s.label], ...s.options.map(o => [optionLabel(s, o), o.label])]));
}

/** Each setting's default, as a frame config map. */
export const defaults = (settings: EditorSetting[]): Record<string, string> =>
  Object.fromEntries(settings.map(s => [s.id, s.defaultValue]));
