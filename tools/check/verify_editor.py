"""Check real WFF editor resources and every REDLINE setting combination, without a watch connection."""
import argparse
import base64
import itertools
import json
from pathlib import Path
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
import zipfile

EFFECTS = {'seconds': ['seconds_beacon'], 'ring_a': ['outer_rotor'], 'ring_b': ['inner_rotor'],
           'breathing': ['red_pulse'],
           'scan': ['radar_sweep'], 'tilt': ['depth']}


def require(condition, message):
    """Fail at the first concrete contract violation; missing data never counts as a pass."""
    if not condition:
        raise ValueError(message)


def resource_name(value, kind):
    """Accept documented bare names or explicit Android resource references."""
    return value.removeprefix('@' + kind + '/')


def apk_resources(apk, aapt2):
    """Resolve AAPT2-renamed ZIP paths through the built resource table, never assumed filenames."""
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
    """Interpret only the generator's small comparison language. Never eval XML or diagnostic input."""
    match = re.fullmatch(r'\[CONFIGURATION\.([a-z_]+)\] == "([A-Z0-9_]+)"', expression.strip())
    if match:
        return state[match[1]] == match[2]
    if expression.strip() == '[BATTERY_PERCENT] <= 15':
        return state['battery'] <= 15
    raise ValueError('Unsupported editor condition: ' + expression)


def selected(node, state, ambient=False):
    """Project selected, visible subtrees; this verifies wiring, not a Samsung runtime implementation."""
    if node.tag == 'Condition':
        expressions = {e.get('name'): (e.text or '') for e in node.findall('Expressions/Expression')}
        for branch in node.findall('Compare'):
            if evaluate(expressions[branch.get('expression')], state):
                return [n for child in branch for n in selected(child, state, ambient)]
        default = node.find('Default')
        return [] if default is None else [n for child in default for n in selected(child, state, ambient)]
    alpha = node.get('alpha', '255')
    if ambient:
        for variant in node.findall('Variant'):
            if variant.get('mode') == 'AMBIENT' and variant.get('target') == 'alpha':
                alpha = variant.get('value')
    if alpha == '0':
        return []
    return [node] + [n for child in node if child.tag not in ('Variant', 'Expressions') for n in selected(child, state, ambient)]


def verify(resources, apk=None, aapt2=None):
    """Validate source and optionally its exact packaged XML, strings, icons, images and glyphs."""
    xml = (resources / 'raw/watchface.xml').read_bytes()
    require(b'<!DOCTYPE' not in xml, 'DOCTYPE is not allowed.')
    root = ET.fromstring(xml)
    strings = {s.get('name'): s.text for s in ET.parse(resources / 'values/strings.xml').getroot()}
    scene = root.find('Scene')
    require(scene is not None, 'Scene missing.')
    require(not list(scene.iter('ListConfiguration')) and not list(scene.iter('BooleanConfiguration')),
            'Use Conditions in the scene; native configuration selectors cannot be nested.')
    for transform in scene.iter('Transform'):
        for animation in transform.findall('Animation'):
            require(animation.get('repeat') == '0' and animation.get('duration') == '1' and animation.get('fps') == '60' and animation.get('interpolation') == 'LINEAR', 'Only bounded 60 fps clock-refreshed transitions are permitted.')
            require('[SECONDS_IN_DAY]' in transform.get('value', '') and 'MILLISECOND' not in transform.get('value', ''), 'Every transition must refresh its target on the integer clock.')
            if transform.get('target') == 'angle':
                require(animation.get('angleDirection') in ('CLOCKWISE', 'COUNTER_CLOCKWISE'), 'Rotation must interpolate across its wrap in the correct direction.')
    require(not any(n.tag == 'ComplicationSlot' for n in scene.iter()), 'Removed instrument/Timer UI must not remain active.')
    require(b'D U N G E O N S' not in xml and b'STEP_COUNT' not in xml and b'instrument_' not in xml, 'Removed readouts or branding remain in the face.')
    require(strings.get('face_name') == 'REDLINE', 'Add this new face\'s explicit acceptance profile before releasing it; do not inherit REDLINE coordinates.')
    for family in ('segments', 'segments_ambient'):
        font = root.find("BitmapFonts/BitmapFont[@name='" + family + "']")
        require(font is not None and len(list(font)) == 11, 'All proportional clock glyphs must be present.')
        for c in '0123456789:':
            glyph = font.find("Character[@name='" + c + "']")
            width = 12 if c == ':' else 16 if c == '1' else 64 if c in '37' else 74
            require(glyph is not None and glyph.get('width') == str(width) and glyph.get('height') == '118', 'Clock glyph must use its tight proportional advance: ' + c)
    definitions = list(root.find('UserConfigurations'))
    require(len(definitions) == 9, 'REDLINE requires its three selectors and six explicit binary settings.')
    settings, referenced = {}, set()
    for setting in definitions:
        id = setting.get('id')
        require(id not in settings, 'Duplicate setting: ' + id)
        require(setting.tag == 'ListConfiguration', 'REDLINE uses explicit list tiles on both editors.')
        options = list(setting)
        settings[id] = [o.get('id') for o in options]
        require(len(set(settings[id])) == len(options), 'Duplicate option: ' + id)
        require(setting.get('defaultValue') in settings[id], 'Invalid default: ' + id)
        for item in [setting] + options:
            for key in ('displayName', 'screenReaderText'):
                label = resource_name(item.get(key, ''), 'string')
                require(bool(strings.get(label)), 'Missing editor label: ' + id + '/' + key)
            icon = resource_name(item.get('icon', ''), 'drawable')
            require(bool(icon), 'Missing editor icon: ' + id)
            referenced.add('drawable/' + icon)
            data = (resources / ('drawable-nodpi/' + icon + '.png')).read_bytes()
            require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Editor icons must be PNG.')
            width, height = struct.unpack('>II', data[16:24])
            require(0 < width <= 400 and 0 < height <= 400 and len(data) <= 16384, 'Oversized editor icon: ' + icon)
    require(next(d for d in definitions if d.get('id') == 'motion_speed').get('defaultValue') == 'SLOW', 'New instances must default to 0.5x.')
    require(set(settings) == {'palette', 'motion_speed', 'motion_style', *EFFECTS}, 'Unexpected setting IDs.')
    for effect in EFFECTS:
        require(settings[effect] == ['TRUE', 'FALSE'], 'Binary choice values changed: ' + effect)
    for element in root.iter():
        name = element.get('resource', '')
        if name and not name.startswith('['):
            referenced.add('drawable/' + resource_name(name, 'drawable'))
    if apk:
        paths, packaged_strings = apk_resources(apk, aapt2)
        png_pairs = []
        with zipfile.ZipFile(apk) as archive:
            require(archive.read(paths['raw/watchface']) == xml, 'Packaged WFF differs from checked source.')
            for ref in referenced:
                require(ref in paths, 'Packaged image missing: ' + ref)
                name = ref.split('/')[1]
                candidates = list((resources / 'drawable-nodpi').glob(name + '.*'))
                require(len(candidates) == 1, 'Source image missing/ambiguous: ' + ref)
                packaged = archive.read(paths[ref])
                if packaged != candidates[0].read_bytes():
                    require(candidates[0].suffix == '.png', 'Packaged lossless mask differs: ' + ref)
                    png_pairs.append(dict(name=ref, source=str(candidates[0].resolve()), packaged=base64.b64encode(packaged).decode('ascii')))
            for name, text in strings.items():
                require(packaged_strings.get(name) == text, 'Packaged label missing/different: ' + name)
        if png_pairs:
            result = subprocess.run(['node', str(Path(__file__).with_name('image-pixels.mjs'))], input=json.dumps(png_pairs), text=True, capture_output=True)
            require(result.returncode == 0, result.stderr or 'Packaged PNG pixel verification failed.')
    maximum_parts, minimum_parts, combinations = 0, 10**9, 0
    for palette, speed, style, bits in itertools.product(settings['palette'], settings['motion_speed'], settings['motion_style'], itertools.product(['TRUE', 'FALSE'], repeat=len(EFFECTS))):
        state = dict(zip(EFFECTS, bits), palette=palette, motion_speed=speed, motion_style=style, battery=80)
        active = selected(scene, state)
        groups = [n.get('name') for n in active if n.tag == 'Group']
        require([n for n in groups if n and n.startswith('palette_')] == ['palette_' + palette], 'Colour selection failed.')
        require(len([n for n in active if n.tag == 'TimeText']) == 1, 'Interactive clock missing/duplicated.')
        time = next(n for n in active if n.tag == 'TimeText')
        require(time.get('x') == '41' and time.get('y') == '157' and time.get('width') == '350' and time.get('height') == '118' and time.find('BitmapFont').get('size') == '117.5' and time.get('align') == 'CENTER', 'Clock must be centred on both axes with a 25% larger font.')
        for effect, names in EFFECTS.items():
            for name in names:
                moving = [n for n in active if n.tag == 'Group' and n.get('name') == name and any(c.tag == 'Gyro' or c.tag == 'Transform' and re.search('MILLISECOND|SECONDS_IN_DAY', c.get('value', '')) for c in n)]
                require(len(moving) == int(speed != 'STILL' and state[effect] == 'TRUE'), 'Effect selection failed: ' + effect)
        if speed == 'STILL' or all(b == 'FALSE' for b in bits):
            require(not any(n.tag == 'Gyro' or re.search('MILLISECOND|SECONDS_IN_DAY', n.get('value', '')) for n in active), 'Disabled motion still has active sources.')
        require(not any(n.get('resource', '').startswith('editor_') for n in active), 'Editor artwork leaks into the face.')
        labels = [n for n in active if n.tag == 'PartText']
        require(len(labels) == 2, 'Only date and battery should accompany the clock.')
        require(sorted(n.find('Text/Font').get('size') for n in labels) == ['20', '21'], 'Date must be half its previous size; battery is a plain percentage.')
        require(any(n.get('x') == '76' and n.get('width') == '280' and n.get('y') == '120' and n.get('height') == '28' and n.find('Text').get('align') == 'CENTER' for n in labels), 'Half-size date must remain centred above time.')
        require(any(n.get('y') == '282' for n in labels), 'Battery must be below time.')
        if style == 'SMOOTH':
            require(not any('MILLISECOND' in n.get('value', '') for n in active), 'Smooth must use clock-refreshed interpolation, not millisecond expressions.')
        else:
            require(not any(n.tag == 'Animation' for n in active), 'Dynamic remains the direct-clock fallback.')
        parts = sum(n.tag in ('PartDraw', 'PartImage', 'PartText', 'TimeText') for n in active)
        maximum_parts, minimum_parts = max(maximum_parts, parts), min(minimum_parts, parts)
        combinations += 1
    require(maximum_parts <= 75, 'Rendered-part count exceeds the REDLINE optimization guardrail.')
    for palette, speed, style in itertools.product(settings['palette'], settings['motion_speed'], settings['motion_style']):
        state = dict.fromkeys(EFFECTS, 'TRUE') | dict(palette=palette, motion_speed=speed, motion_style=style, battery=15)
        ambient = selected(scene, state, True)
        require(len([n for n in ambient if n.tag == 'TimeText']) == 1, 'Ambient clock missing.')
        time = next(n for n in ambient if n.tag == 'TimeText')
        require(time.get('x') == '41' and time.get('width') == '350' and time.get('y') == '169' and time.get('height') == '94' and time.find('BitmapFont').get('size') == '94', 'Ambient must retain its compact centred dim time.')
        require(not any(n.tag in ('PartImage', 'PartDraw', 'Transform', 'Gyro') for n in ambient), 'Ambient must contain static time only.')
    return dict(configurations=combinations, editorOptions=sum(map(len, settings.values())), minRenderedParts=minimum_parts,
                maxRenderedParts=maximum_parts, packaged=bool(apk), runtimeAcceptance='pending Galaxy Wearable and Watch7 test')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
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
