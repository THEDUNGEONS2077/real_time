# real_time: project instructions

Resource-only Wear OS watch faces for the user's Galaxy Watch7 40 mm. Read ARCHITECTURE.md, DESIGN.md and OPTIMIZATION.md before changing a face.

- Each face is independent. Do not port the family's wallpapers into this project.
- Keep WFF APKs free of executable code, permissions, analytics and network access.
- Comments explain purpose and layer. Document exported declarations and non-obvious logic. JSON, binary resources and the unmodified Gradle wrapper use their native formats without added comments.
- Edit the shared TypeScript design, then run `npm run compose`. Generated Android resources are committed; reproduction is checked byte for byte.
- Keep all colour roles in the palette. White and low-battery warning are fixed because WFF permits five colours per option.
- Disabled effects select static subtrees, rather than retaining fast expressions behind alpha zero.
- Keep the minimal ambient clock static. AOD is outside normal use and measurement baselines.
- Run `npm run check` and `scripts/release-wear.sh --verify-only` before declaring a build ready.
- Google validators are pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`, XML validator 1.7.0 and memory evaluator 1.5.1. Record intentional pin changes.
- Keys and passwords never go in git. Raw watch diagnostics are private and gitignored; commit only reviewed summaries.
- Downloads go in their own new empty directory, with project scripts elsewhere. Run Python on untrusted exports using `python3 -I`. Do not execute files from captures.
- Any preview server must bind to 127.0.0.1, be stopped by PID, and be checked with `ss -ltnp`. The supplied gallery needs no server.
- Installation and watch diagnostics use the phone only. Do not connect this PC to the watch with ADB.
- Prefer the separate phone helper for installing face APKs and testing/copying reports. Wear Installer 2 remains optional. The helper's sole INTERNET permission is for direct, validated private-LAN watch connections; no analytics or automatic uploads are allowed. Face APKs remain resource-only and permission-free.
- For helper changes, run `scripts/release-diagnostics.sh --verify-only`. Preserve explicit-copy summaries, non-backed-up storage, fixed collector commands, missing-metric labels and private-address validation. New faces must extend the helper's face/effect catalogue as needed rather than mislabelling HALO settings as their own.
- Preserve the installer's explicit APK selection, face/signature/code/permission checks, bounded streaming, installed-version verification and battery-test exclusion. Add future faces to the installer catalogue intentionally; never add automatic uninstall, forced downgrade or silent installation.
- Resolve packaged face resources by name through their resource table. AAPT2 renames ZIP paths; regression tests must include an actual built APK, not only archives with source-tree filenames.
- Ask before creating the public GitHub repository, each push and each published release. Local commits are allowed. Describe a concrete reviewed artifact before requesting publication.
- Preserve the configured human git identity. Do not copy another agent's coauthor trailer or put the user's email in source or requests.
- Do not claim device acceptance or performance improvements until the user supplies device evidence. Use they/them when referring to the user.
- Every future face must consult OPTIMIZATION.md, expose measurable optional effects, and use the shared measurement protocol.

For later helper builds, fetch the released face tags before building so catalogue provenance stays pinned. New faces require their own design/acceptance document and independent release tag.

Commands:

```bash
npm ci --ignore-scripts
npm run compose
npm run check
./gradlew :faces:halo:assembleDebug
node scripts/setup-signing.mjs       # once; back up private signing files
bash scripts/setup-validators.sh
bash scripts/setup-perfetto.sh
bash scripts/release-wear.sh --verify-only
```
