# real_time: project instructions

Resource-only Wear OS watch faces for the user's Galaxy Watch7 40 mm. Read ARCHITECTURE.md, DESIGN.md, FACE_STANDARD.md and OPTIMIZATION.md before changing a face.

- Every future face must follow FACE_STANDARD.md: REDLINE architecture and HUD design principles, distinct visual style, functional Galaxy Wearable/on-watch editing, fixed readable time, resumable motion and shared optimization/measurement gates.
- NEXUS 0.1.2 is the user-accepted performance/editor checkpoint. Start future faces from its compact editor and optimized rendering approach; consult docs/CHECKPOINT-NEXUS-0.1.2.md. Seamless editing and motion are acceptance requirements. Keep the released checkpoint intact and verify each new face on the phone/watch before claiming equivalent responsiveness.
- REACTOR 0.1.0 is also accepted for design and perceived running performance. Carry its readable industrial HUD, restrained baked glow and efficient motion principles into distinct future designs; consult docs/CHECKPOINT-REACTOR-0.1.0.md. Its general acceptance does not certify every editor/provider/lifecycle check.
- Each face is independent. Do not port the family's wallpapers into this project.
- Keep WFF APKs free of executable code, permissions, analytics and network access.
- Comments explain purpose and layer: a file header, a doc comment on every export and block comments on non-obvious logic (the user's standing request). Write readable, formatted code rather than dense one-liners. JSON, binary resources and the unmodified Gradle wrapper use their native formats without added comments.
- Edit the shared TypeScript design, then run `npm run compose`. Generated Android resources are committed; reproduction is checked byte for byte.
- Keep all colour roles in the palette. White and low-battery warning are fixed because WFF permits five colours per option.
- Disabled effects select static subtrees, rather than retaining fast expressions behind alpha zero.
- Keep the minimal ambient clock static. AOD is outside normal use and measurement baselines.
- Run `npm run check` and `scripts/release-wear.sh --verify-only` before declaring a build ready.
- Google validators are pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`, XML validator 1.7.0 and memory evaluator 1.5.1. Record intentional pin changes.
- Keys and passwords never go in git. Raw watch diagnostics are private and gitignored; commit only reviewed summaries.
- Downloads go in their own new empty directory, with project scripts elsewhere. Run Python on untrusted exports using `python3 -I`. Do not execute files from captures.
- Any preview server must bind to 127.0.0.1, be stopped by PID, and be checked with `ss -ltnp`. The supplied gallery needs no server.
- Installation uses the phone only. Do not connect this PC to the watch with ADB.
- Install face APKs with the separate phone installer (`diagnostics/phone`). Since 0.7.0 it only installs: the user reports smoothness and performance themselves, so do not add measurement features back unless asked. Its sole INTERNET permission is for direct, validated private-LAN watch connections; no analytics or automatic uploads are allowed. Face APKs remain resource-only and permission-free.
- For installer changes, run `scripts/release-diagnostics.sh --verify-only`. Preserve non-backed-up storage, explicit-copy error summaries and private-address validation. Add each new face's package to FaceCatalog.
- Preserve the installer's explicit APK selection, face/signature/code/permission checks, bounded streaming, installed-version verification and battery-test exclusion. Add future faces to the installer catalogue intentionally; never add automatic uninstall, forced downgrade or silent installation.
- Resolve packaged face resources by name through their resource table. AAPT2 renames ZIP paths; regression tests must include an actual built APK, not only archives with source-tree filenames.
- Ask before creating the public GitHub repository, each push and each published release. Local commits are allowed. Describe a concrete reviewed artifact before requesting publication.
- Preserve the configured human git identity. Do not copy another agent's coauthor trailer or put the user's email in source or requests.
- Do not claim device acceptance or performance improvements until the user supplies device evidence. Use they/them when referring to the user.
- Passing XML and memory checks does not prove a face renders on the watch; keep candidate workarounds for a device failure explicitly unconfirmed until the user confirms them.
- Every future face must consult OPTIMIZATION.md and expose switchable optional effects.

New faces require their own design/acceptance document and independent release tag.

Commands:

```bash
npm ci --ignore-scripts
npm run compose
npm run check
./gradlew :faces:halo:assembleDebug
node scripts/setup-signing.mjs       # once; back up private signing files
bash scripts/setup-validators.sh
bash scripts/release-wear.sh --verify-only
```

For REDLINE and all future faces, use the shared editor catalogue (`tools/compose/src/editor`) with real captioned option icons, accessible packaged labels and Condition-based selection. HALO's generator under `tools/compose/halo` is frozen and must stay byte-identical. Fonts under `tools/compose/fonts` are pinned by SHA-256 in `src/fonts/outline.ts`; keep their OFL licences beside them. Never nest native scene configuration selectors. Add an explicit selected-tree acceptance profile before releasing a new face. Clock-driven motion must be tested after leaving/re-entering the face. Local validation cannot substitute for Galaxy Wearable Save/persistence and watch acceptance.
