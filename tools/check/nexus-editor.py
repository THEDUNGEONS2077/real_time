"""Check NEXUS editor sharing against the accepted 0.1.1 drawing contract.

The fixture hashes resolved drawing instructions, not the container structure.
It was recorded from the released 0.1.1 XML before changing the generator. This
checks colours, glyph sizes/boxes, painter order, motion and provider content
without claiming to reproduce Samsung's renderer or editor loading time.
"""
import argparse
import copy
import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
import xml.etree.ElementTree as ET


# Explicit file loading keeps Python -I isolation; no project directory on sys.path.
spec = importlib.util.spec_from_file_location('editor_checker', Path(__file__).with_name('verify_editor.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / 'tools/compose/test/fixtures/nexus-0.1.1-drawing-contract.json'


def canonical(node):
    """Canonical attributes/content, with resolved font-colour transforms removed."""
    return [node.tag, sorted(node.attrib.items()), (node.text or '').strip(),
            [canonical(child) for child in node
             if not (node.tag == 'BitmapFont' and child.tag == 'Transform' and child.get('target') == 'color')]]


def drawing(scene, state, ambient=False):
    """Drawing instructions in painter order, including inherited motion groups."""
    result = []
    for node in checker.selected(scene, state, ambient):
        if node.tag in ('TimeText', 'PartText', 'PartImage', 'PartDraw', 'ComplicationSlot'):
            result.append(canonical(node))
        elif node.tag == 'Group' and any(c.tag in ('Transform', 'Gyro') and c.get('target') != 'tintColor' for c in node):
            # Child drawings occur separately in the flat traversal; retain the
            # ancestor's geometry and motion without hashing them twice.
            group = ET.Element('Group', node.attrib)
            group.extend(copy.deepcopy(c) for c in node if c.tag in ('Transform', 'Gyro'))
            result.append(canonical(group))
    return result


def contract(root):
    """Exhaust the text interactions and palette/speed/effect states separately."""
    settings = {s.get('id'): [o.get('id') for o in s] for s in root.find('UserConfigurations')}
    base = {s.get('id'): s.get('defaultValue') for s in root.find('UserConfigurations')}
    base['battery'] = 80
    scene = root.find('Scene')
    effects = list(checker.PROFILES['NEXUS']['effects'])
    states = [dict(base, palette=p, clock_font=f, glow=g, clock_size=s, battery=b)
              for p, f, g, s, b in itertools.product(settings['palette'], settings['clock_font'],
                                                     settings['glow'], settings['clock_size'], [5, 15, 16, 80])]
    states += [dict(base, palette=p, motion_speed=s, **dict(zip(effects, bits)))
               for p, s, bits in itertools.product(settings['palette'], settings['motion_speed'],
                                                   itertools.product(['TRUE', 'FALSE'], repeat=len(effects)))]
    digest = hashlib.sha256()
    for state in states:
        digest.update(json.dumps([state, drawing(scene, state)], sort_keys=True, separators=(',', ':')).encode())
    ambient = hashlib.sha256()
    for p, f in itertools.product(settings['palette'], settings['clock_font']):
        state = dict(base, palette=p, clock_font=f)
        ambient.update(json.dumps([state, drawing(scene, state, True)], sort_keys=True, separators=(',', ':')).encode())
    # Missing/unknown stored palette values must continue to use Fusion, including
    # the new typed colour expressions. No app-data reset should be necessary.
    for p in ('', 'UNKNOWN'):
        checker.require(drawing(scene, dict(base, palette=p)) == drawing(scene, base), 'Palette fallback changed.')
    return dict(baselineVersion='0.1.1', interactiveStates=len(states), ambientStates=48,
                interactiveSha256=digest.hexdigest(), ambientSha256=ambient.hexdigest(),
                editorCatalogueSha256=hashlib.sha256(json.dumps(canonical(root.find('UserConfigurations'))).encode()).hexdigest())


def main():
    """Verify normally; recording requires an explicit historical baseline file."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, help='Record a fixture from the released 0.1.1 XML, never from the candidate.')
    args = parser.parse_args()
    source = args.baseline or ROOT / 'faces/nexus/src/main/res/raw/watchface.xml'
    root = ET.parse(source).getroot()
    result = contract(root)
    if args.baseline:
        checker.require(len(list(root.iter('TimeText'))) == 480, 'Expected the unfactored 0.1.1 baseline.')
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_text(json.dumps(result, indent=2) + '\n')
    else:
        checker.require(result == json.loads(FIXTURE.read_text()), 'NEXUS differs from the accepted drawing/editor contract.')
        checker.require(len(list(root.iter('TimeText'))) == 102, 'Palette clock copies returned.')
        checker.require(len(source.read_bytes()) < 260000, 'NEXUS editor definition exceeded its sharing budget.')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
