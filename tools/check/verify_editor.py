"""Check a face's editor wiring, fonts, readouts and complication slot, without a watch.

The checker reads the generated watchface.xml, resolves its Conditions for a set
of editor choices, and asserts what the watch would draw. With --apk it also
compares the packaged resources (located through AAPT2's resource table, because
AAPT2 renames ZIP paths) against the generated sources.

Each face has a profile below (its effects, defaults and layout). Editor combinations
multiply quickly (REDLINE's palette x font x glow x size x speed x style x six effects
is over 170,000), so states are chosen to cover every interaction that matters:
  - every option of every setting, with all else at defaults;
  - every clock combination (font x glow x size);
  - every motion combination (speed x style, where offered, x effect bits);
  - a fixed-seed random sample across all settings.
"""
import argparse
import base64
import itertools
import json
import math
from pathlib import Path
import random
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
import zipfile

# Per-face profiles, selected by the face_name string.
#   effects:        moving groups each effect controls; active exactly when the effect is ON and motion is not STILL
#   defaults:       settings whose default is part of the face's contract
#   system_fonts:   clock fonts whose date/battery use the system font instead of a baked readout face
#   inner_radius:   everything readable sits inside this opening
#   max_parts:      guardrail on drawn parts in any selected state
PROFILES = {
    'REDLINE': dict(
        effects={'seconds': ['seconds_beacon'], 'ring_a': ['outer_rotor'], 'ring_b': ['inner_rotor', 'inset_rotor'],
                 'breathing': ['red_pulse'], 'scan': ['radar_sweep'], 'tilt': ['depth']},
        defaults={'motion_speed': 'SLOW', 'clock_font': 'REDLINE', 'clock_size': 'MEDIUM'},
        system_fonts={'REDLINE'}, inner_radius=145, max_parts=80),
    'CIPHER': dict(
        effects={'rain': ['rain_0', 'rain_7'], 'code_rings': ['outer_code', 'inner_code'], 'arc_ring': ['arc_ring'],
                 'sweep': ['comet_sweep'], 'seconds': ['seconds_mark']},
        defaults={'motion_speed': 'SLOW', 'clock_font': 'VT323', 'clock_size': 'MEDIUM', 'glow': 'HIGH', 'palette': 'PHOSPHOR'},
        system_fonts=set(), inner_radius=142, max_parts=40),
}
PROFILE = PROFILES['REDLINE']
# Clock size multipliers, matching tools/compose/src/fonts/catalog.ts.
CLOCK_CELL = 118
SIZES = {'SMALL': 0.85, 'MEDIUM': 117.5 / 118, 'LARGE': 1.1}
AMBIENT_SCALE = 94 / 118
COMPLICATION_TYPES = {'EMPTY', 'SHORT_TEXT', 'RANGED_VALUE', 'MONOCHROMATIC_IMAGE', 'SMALL_IMAGE'}
LIVE_SOURCE = re.compile(r'MILLISECOND|SECONDS_IN_DAY|ACCELEROMETER')


def require(condition, message):
    """Fail at the first concrete violation; missing data never counts as a pass."""
    if not condition:
        raise ValueError(message)


def bare(value, kind):
    """Accept bare resource names or explicit @kind/ references."""
    return value.removeprefix('@' + kind + '/')


def png_size(data):
    """Width and height from a PNG header."""
    require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Expected a PNG.')
    return struct.unpack('>II', data[16:24])


def apk_resources(apk, aapt2):
    """Map resource names to packaged ZIP paths and strings, via AAPT2's resource table."""
    dump = subprocess.run([aapt2, 'dump', 'resources', str(apk)], capture_output=True, text=True, check=True).stdout
    paths, strings, current = {}, {}, None
    for line in dump.splitlines():
        match = re.search(r'\bresource 0x[0-9a-f]+ (\w+/\w+)', line)
        if match:
            current = match[1]
        file = re.search(r'\(file\) (\S+)', line)
        if current and file:
            paths[current] = file[1]
        if current and current.startswith('string/'):
            text = re.search(r'\([^)]*\) (".*")$', line)
            if text:
                strings[current.removeprefix('string/')] = json.loads(text[1])
    return paths, strings


def evaluate(expression, state):
    """Interpret only the generator's own comparisons. XML is never eval'd."""
    match = re.fullmatch(r'\[CONFIGURATION\.([a-z_]+)\] == "([A-Z0-9_]+)"', expression.strip())
    if match:
        return state[match[1]] == match[2]
    if expression.strip() == '[BATTERY_PERCENT] <= 15':
        return state['battery'] <= 15
    raise ValueError('Unsupported condition: ' + expression)


def selected(node, state, ambient=False):
    """Visible nodes for a state: resolve Conditions and drop subtrees whose alpha is 0."""
    if node.tag == 'Condition':
        expressions = {e.get('name'): (e.text or '') for e in node.findall('Expressions/Expression')}
        for branch in node.findall('Compare'):
            if evaluate(expressions[branch.get('expression')], state):
                return [n for child in branch for n in selected(child, state, ambient)]
        default = node.find('Default')
        return [] if default is None else [n for child in default for n in selected(child, state, ambient)]
    alpha = node.get('alpha', '255')
    for variant in node.findall('Variant'):
        if ambient and variant.get('mode') == 'AMBIENT' and variant.get('target') == 'alpha':
            alpha = variant.get('value')
    if alpha == '0':
        return []
    return [node] + [n for child in node if child.tag not in ('Variant', 'Expressions') for n in selected(child, state, ambient)]


def check_state(active, state):
    """Assert what one editor state draws. Returns the number of drawn parts."""
    groups = [n.get('name') for n in active if n.tag == 'Group']
    require([g for g in groups if g and g.startswith('palette_')] == ['palette_' + state['palette']], 'Palette selection failed.')

    # Exactly one interactive clock, in the chosen font and glow, centred on (216,216) at the chosen size.
    clocks = [n for n in active if n.tag == 'TimeText']
    require(len(clocks) == 1, 'Interactive clock missing or duplicated.')
    clock = clocks[0]
    font = clock.find('BitmapFont')
    family = 'clock_{}_{}'.format(state['clock_font'].lower(), state['glow'].lower())
    require(font.get('family') == family, 'Clock font/glow selection failed: ' + family)
    require(math.isclose(float(font.get('size')), CLOCK_CELL * SIZES[state['clock_size']], abs_tol=0.01), 'Clock size selection failed.')
    box = [int(clock.get(k)) for k in ('x', 'y', 'width', 'height')]
    require(box[0] * 2 + box[2] == 432 and box[1] * 2 + box[3] == 432, 'Clock box must be centred on (216,216).')
    require(clock.get('align') == 'CENTER' and clock.get('hourFormat') == 'SYNC_TO_DEVICE', 'Clock must centre and follow the 12/24-hour setting.')

    # Battery above date, in the same font family as the clock (or the system font for REDLINE).
    # Slot text uses slot-relative y values, so the readouts are the PartTexts at the readout rows.
    readouts = [n for n in active if n.tag == 'PartText' and n.get('y') in ('80', '118')]
    require(sorted(int(t.get('y')) for t in readouts) == [80, 118], 'Battery and date readouts must both show once.')
    for t in readouts:
        if state['clock_font'] in PROFILE['system_fonts']:
            require(t.find('Text/Font') is not None, 'This font\'s readouts use the system font.')
        else:
            require(t.find('Text/BitmapFont').get('family') == 'readout_' + state['clock_font'].lower(), 'Readout font must follow the clock font.')
        x, w = int(t.get('x')), int(t.get('width'))
        require(x * 2 + w == 432 and t.find('Text').get('align') == 'CENTER', 'Readouts must be centred.')

    # Effects: each moving group is present exactly when its effect is on and motion is not STILL.
    for effect, names in PROFILE['effects'].items():
        for name in names:
            moving = [n for n in active if n.tag == 'Group' and n.get('name') == name and any(
                c.tag == 'Gyro' or c.tag == 'Transform' and LIVE_SOURCE.search(c.get('value', '')) for c in n)]
            require(len(moving) == int(state['motion_speed'] != 'STILL' and state[effect] == 'TRUE'), 'Effect selection failed: ' + name)
    decorative = [n for n in active if n.tag in ('Transform', 'Gyro') and n.get('target') != 'width']
    if state['motion_speed'] == 'STILL' or all(state[e] == 'FALSE' for e in PROFILE['effects']):
        require(not any(n.tag == 'Gyro' or LIVE_SOURCE.search(n.get('value', '')) for n in decorative), 'Still/disabled motion keeps live sources.')
    # GLIDE interpolates toward whole-second targets; SMOOTH and DYNAMIC read the live clock and never animate,
    # so their motion starts the moment the face is shown.
    if state.get('motion_style') == 'GLIDE':
        require(not any('MILLISECOND' in n.get('value', '') for n in active), 'Glide must use clock-refreshed targets, not milliseconds.')
    else:
        require(not any(n.tag == 'Animation' for n in active), 'Smooth and Dynamic must not animate.')
    require(not any(n.get('resource', '').startswith('editor_') for n in active), 'Editor artwork leaks into the face.')
    return sum(n.tag in ('PartDraw', 'PartImage', 'PartText', 'TimeText') for n in active)


def check_fonts(root, resources):
    """Every BitmapFont character points at a real mask whose pixels match its declared size."""
    fonts = {f.get('name'): f for f in root.iter('BitmapFont') if f.get('name')}
    for name, font in fonts.items():
        chars = {c.get('name'): c for c in font}
        expected = set('0123456789:') if name.startswith('clock_') else set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%_')
        require(set(chars) == expected, 'Unexpected character set in ' + name)
        for c, entry in chars.items():
            data = (resources / 'drawable-nodpi' / (entry.get('resource') + '.png')).read_bytes()
            require(png_size(data) == (int(entry.get('width')), int(entry.get('height'))), 'Glyph mask size differs from its Character box: {}/{}'.format(name, c))
    return len(fonts)


def check_slot(scene):
    """One Timer slot: tappable, all provider types, hidden in ambient, inside the inner ring."""
    slots = [n for n in scene if n.tag == 'ComplicationSlot']
    require(len(slots) == 1, 'Exactly one complication slot is expected at scene level.')
    slot = slots[0]
    require(set(slot.get('supportedTypes').split()) == COMPLICATION_TYPES, 'Slot must accept every Timer provider type.')
    require({c.get('type') for c in slot.findall('Complication')} == COMPLICATION_TYPES, 'Every supported type needs a rendering.')
    require(slot.get('isCustomizable') == 'TRUE', 'Slot must be editable.')
    require(any(v.get('mode') == 'AMBIENT' and v.get('value') == '0' for v in slot.findall('Variant')), 'Slot must hide in ambient.')
    policy = slot.find('DefaultProviderPolicy')
    require(policy is not None and policy.get('defaultSystemProvider') == 'EMPTY', 'No provider component may be guessed.')
    x, y, w, h = (int(slot.get(k)) for k in ('x', 'y', 'width', 'height'))
    for cx, cy in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)):
        require(math.hypot(cx - 216, cy - 216) <= PROFILE['inner_radius'], 'Complication slot must sit inside the inner ring.')
    return slot


def verify(resources, apk=None, aapt2=None):
    """Validate the generated face, and optionally its exact packaged copy."""
    xml = (resources / 'raw/watchface.xml').read_bytes()
    require(b'<!DOCTYPE' not in xml, 'DOCTYPE is not allowed.')
    root = ET.fromstring(xml)
    strings = {s.get('name'): s.text for s in ET.parse(resources / 'values/strings.xml').getroot()}
    global PROFILE
    require(strings.get('face_name') in PROFILES, 'No checker profile for this face; add one to PROFILES.')
    PROFILE = PROFILES[strings['face_name']]
    scene = root.find('Scene')
    require(scene is not None, 'Scene missing.')
    require(not list(scene.iter('ListConfiguration')) and not list(scene.iter('BooleanConfiguration')),
            'Use Conditions in the scene; native configuration selectors cannot be nested.')
    require(b'ColorConfiguration' not in xml and not re.search(rb'CONFIGURATION\.palette\.\d', xml), 'Colours must be literal.')

    # Transitions: one second, linear, non-repeating, refreshed by the integer clock.
    for transform in scene.iter('Transform'):
        for animation in transform.findall('Animation'):
            require(animation.get('repeat') == '0' and animation.get('duration') == '1' and animation.get('fps') == '60' and animation.get('interpolation') == 'LINEAR', 'Only bounded 60 fps clock-refreshed transitions are permitted.')
            require('[SECONDS_IN_DAY]' in transform.get('value', '') and 'MILLISECOND' not in transform.get('value', ''), 'Every transition must refresh on the integer clock.')
            if transform.get('target') == 'angle':
                require(animation.get('angleDirection') in ('CLOCKWISE', 'COUNTER_CLOCKWISE'), 'Rotation must wrap in its own direction.')

    # Editor catalogue: flat lists, labels and icons for every setting and option.
    definitions = list(root.find('UserConfigurations'))
    settings, defaults, referenced = {}, {}, set()
    for setting in definitions:
        sid = setting.get('id')
        require(sid not in settings and setting.tag == 'ListConfiguration', 'Settings must be unique list tiles: ' + sid)
        settings[sid] = [o.get('id') for o in setting]
        defaults[sid] = setting.get('defaultValue')
        require(len(set(settings[sid])) == len(settings[sid]) and defaults[sid] in settings[sid], 'Invalid options/default: ' + sid)
        for item in [setting] + list(setting):
            for key in ('displayName', 'screenReaderText'):
                require(bool(strings.get(bare(item.get(key, ''), 'string'))), 'Missing editor label: {}/{}'.format(sid, key))
            icon = bare(item.get('icon', ''), 'drawable')
            require(bool(icon), 'Missing editor icon: ' + sid)
            referenced.add('drawable/' + icon)
            data = (resources / 'drawable-nodpi' / (icon + '.png')).read_bytes()
            width, height = png_size(data)
            require(0 < width <= 400 and 0 < height <= 400 and len(data) <= 16384, 'Oversized editor icon: ' + icon)
    styles = {'motion_style'} if 'motion_style' in settings else set()
    require(set(settings) == {'palette', 'clock_font', 'clock_size', 'glow', 'motion_speed', *styles, *PROFILE['effects']}, 'Unexpected setting IDs.')
    for sid, value in PROFILE['defaults'].items():
        require(defaults[sid] == value, 'Default changed: {} should be {}'.format(sid, value))
    for effect in PROFILE['effects']:
        require(settings[effect] == ['TRUE', 'FALSE'], 'Binary values changed: ' + effect)

    font_count = check_fonts(root, resources)
    slot = check_slot(scene)
    require(strings.get(slot.get('displayName')), 'Slot needs an editor label.')

    # States: every single option, every clock combination, every motion combination, then a random sample.
    base = dict(defaults, battery=80)
    states = [dict(base, **{sid: option}) for sid, options in settings.items() for option in options]
    states += [dict(base, clock_font=f, glow=g, clock_size=s) for f, g, s in itertools.product(settings['clock_font'], settings['glow'], settings['clock_size'])]
    effect_ids = list(PROFILE['effects'])
    style_options = settings.get('motion_style', [None])
    states += [dict(base, motion_speed=sp, **({'motion_style': st} if st else {}), **dict(zip(effect_ids, bits)))
               for sp, st, bits in itertools.product(settings['motion_speed'], style_options, itertools.product(['TRUE', 'FALSE'], repeat=len(effect_ids)))]
    rng = random.Random(2077)
    states += [dict({sid: rng.choice(options) for sid, options in settings.items()}, battery=rng.choice([5, 15, 16, 80])) for _ in range(400)]
    parts = [check_state(selected(scene, state), state) for state in states]
    require(max(parts) <= PROFILE['max_parts'], 'Rendered-part count exceeds the face\'s guardrail.')

    # Ambient: the selected font's crisp dim clock and nothing else.
    for font_id in settings['clock_font']:
        ambient = selected(scene, dict(base, clock_font=font_id), True)
        clocks = [n for n in ambient if n.tag == 'TimeText']
        require(len(clocks) == 1 and clocks[0].find('BitmapFont').get('family') == 'clock_{}_off'.format(font_id.lower()), 'Ambient clock must use the crisp face of the chosen font.')
        require(math.isclose(float(clocks[0].find('BitmapFont').get('size')), CLOCK_CELL * AMBIENT_SCALE, abs_tol=0.01), 'Ambient clock keeps its compact size.')
        require(not any(n.tag in ('PartImage', 'PartDraw', 'PartText', 'Transform', 'Gyro', 'ComplicationSlot') for n in ambient), 'Ambient must be static time only.')

    for element in root.iter():
        name = element.get('resource', '')
        if name and not name.startswith('['):
            referenced.add('drawable/' + bare(name, 'drawable'))

    if apk:
        paths, packaged_strings = apk_resources(apk, aapt2)
        png_pairs = []
        with zipfile.ZipFile(apk) as archive:
            require(archive.read(paths['raw/watchface']) == xml, 'Packaged WFF differs from the checked source.')
            for ref in referenced:
                require(ref in paths, 'Packaged image missing: ' + ref)
                candidates = list((resources / 'drawable-nodpi').glob(ref.split('/')[1] + '.*'))
                require(len(candidates) == 1, 'Source image missing/ambiguous: ' + ref)
                packaged = archive.read(paths[ref])
                if packaged != candidates[0].read_bytes():
                    # AAPT2 may re-encode PNGs losslessly; compare decoded pixels instead.
                    require(candidates[0].suffix == '.png', 'Packaged lossless image differs: ' + ref)
                    png_pairs.append(dict(name=ref, source=str(candidates[0].resolve()), packaged=base64.b64encode(packaged).decode('ascii')))
            for name, text in strings.items():
                require(packaged_strings.get(name) == text, 'Packaged label missing/different: ' + name)
        if png_pairs:
            result = subprocess.run(['node', str(Path(__file__).with_name('image-pixels.mjs'))], input=json.dumps(png_pairs), text=True, capture_output=True)
            require(result.returncode == 0, result.stderr or 'Packaged PNG pixel verification failed.')

    return dict(states=len(states), settings=len(settings), editorOptions=sum(map(len, settings.values())),
                bitmapFonts=font_count, minRenderedParts=min(parts), maxRenderedParts=max(parts),
                packaged=bool(apk), runtimeAcceptance='pending Galaxy Wearable and Watch7 test')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--resources', required=True, type=Path)
    parser.add_argument('--apk', type=Path)
    parser.add_argument('--aapt2')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = verify(args.resources, args.apk, args.aapt2)
    text = json.dumps(report, indent=2) + '\n'
    if args.report:
        args.report.write_text(text)
    print(text, end='')
