/**
 * Build layer: write each face's generated Android resources, or check them byte for byte.
 *
 *   node tools/compose/src/build.ts                 # regenerate every face
 *   node tools/compose/src/build.ts --check         # fail if anything differs or is stale
 *   node tools/compose/src/build.ts --face redline --out DIR
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { haloResources } from '../halo/resources.ts';
import { redlineResources } from '../faces/redline/resources.ts';
import { cipherResources } from '../faces/cipher/resources.ts';
import { nexusResources } from '../faces/nexus/resources.ts';

/** Faces with their own resource-only module under faces/. */
export type FaceName = 'halo' | 'redline' | 'cipher' | 'nexus';
/** Every face, in build order. */
export const faces: FaceName[] = ['halo', 'redline', 'cipher', 'nexus'];

/** Repository root, independent of the caller's working directory. */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** The complete generated resource set of a face. Nothing is written. */
export function resources(face: FaceName): Promise<Map<string, Buffer>> {
  switch (face) {
    case 'halo': return haloResources();
    case 'redline': return redlineResources();
    case 'cipher': return cipherResources();
    case 'nexus': return nexusResources();
  }
}

/**
 * Files this generator owns and may delete when they are no longer produced:
 * content-addressed layers, editor tiles and glyph masks.
 */
const generatedName = /^drawable-nodpi\/(?:cached_[a-z]+_[0-9a-f]{16}\.webp|editor_[a-z0-9_]+\.png|(?:clock|readout)_[a-z0-9_]+\.png|segment_[a-z_0-9]+\.png|(?:cipher|nexus)_[a-z0-9_]+\.webp)$/;

/** Write (or with `check`, verify) a face's resources into a res/ directory. */
export async function build(destination: string, check = false, face: FaceName = 'halo'): Promise<void> {
  const files = await resources(face);
  for (const [name, data] of files) {
    const path = resolve(destination, name);
    if (check) {
      const existing = await readFile(path).catch(() => Buffer.alloc(0));
      if (!existing.equals(data)) throw new Error(`Generated resource differs: ${name}. Run npm run compose.`);
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
    }
  }
  // Stale files must fail too: Android would otherwise package them silently.
  for (const entry of await readdir(destination, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relative = resolve(entry.parentPath, entry.name).slice(resolve(destination).length + 1);
    if (files.has(relative)) continue;
    if (check) throw new Error(`Unexpected resource: ${relative}`);
    if (generatedName.test(relative)) await rm(resolve(destination, relative));
  }
}

// Command-line entry point.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const out = args.indexOf('--out'), faceFlag = args.indexOf('--face');
  const selected = faceFlag >= 0 ? [args[faceFlag + 1]] : out >= 0 ? ['halo'] : faces;
  for (const face of selected) {
    if (!faces.includes(face as FaceName)) throw new Error(`Unknown face: ${face}`);
    await build(out >= 0 ? resolve(args[out + 1]) : resolve(root, `faces/${face}/src/main/res`), args.includes('--check'), face as FaceName);
  }
  console.log(args.includes('--check') ? 'Generated resources match byte for byte.' : `${selected.join(', ')} resources generated.`);
}
