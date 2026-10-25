/**
 * WFF layer: a tiny, escaping XML builder plus the Condition helper.
 *
 * Every string a caller passes as child content must already be serialized XML;
 * attribute values are always escaped here.
 */

/** Escape text and attribute values. */
export const escapeXml = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

/** Attribute map; undefined values are dropped so optional attributes stay out of the XML. */
export type Attrs = Record<string, string | number | undefined>;

/** Build one element. `children` is trusted, already-serialized XML. */
export function tag(name: string, attrs: Attrs = {}, children = ''): string {
  const written = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join('');
  return `<${name}${written}>${children}</${name}>`;
}

/** The full 432-unit canvas, used by most groups and parts. */
export const canvas = { x: 0, y: 0, width: 432, height: 432 } as const;

/**
 * A WFF Condition. Each case pairs an expression with the XML shown when it is
 * true; the first true case wins, otherwise `fallback` is shown.
 * Conditions may nest freely, unlike native configuration selectors.
 */
export function condition(cases: { when: string; then: string }[], fallback = ''): string {
  const expressions = cases.map((c, i) => tag('Expression', { name: `c${i}` }, `<![CDATA[${c.when}]]>`)).join('');
  const compares = cases.map((c, i) => tag('Compare', { expression: `c${i}` }, c.then)).join('');
  return tag('Condition', {}, tag('Expressions', {}, expressions) + compares + (fallback ? tag('Default', {}, fallback) : ''));
}

/** WFF expression that is true while the battery is at or below the warning threshold. */
export const lowBattery = '[BATTERY_PERCENT] <= 15';

/** Insert line breaks after large closing tags so validator errors point at useful lines. */
export const breakLines = (xml: string): string =>
  xml.replaceAll('</PartDraw>', '</PartDraw>\n').replaceAll('</Group>', '</Group>\n').replaceAll('</Condition>', '</Condition>\n');
