# NEXUS 0.1.1 — local verification

Reviewed 2026-10-29. Resource-only WFF 4, API 36, 432×432 canvas. Version 0.1.0 is published and its appearance is accepted at default settings; the user requests smoother delivery. These results concern the 0.1.1 optimization candidate; publication and device comparison are pending. Installer 0.7.2 is unchanged.

| Check | Result |
|---|---|
| Project checks | TypeScript passes; 87 tests pass; all four faces reproduce byte for byte |
| Existing faces | HALO's frozen generator and all HALO/REDLINE/CIPHER resources remain unchanged |
| Google XML validator | 1.7.0, WFF 4: PASSED |
| Official memory evaluator | 1.5.1: PASS; 13,857,204 active bytes (**13.22 MiB**, down from 15.11), 959,576 ambient bytes (**0.92 MiB**, unchanged); limits 100 / 10 MiB |
| Packaged editor inspection | **746 states**, 11 settings, 36 option tiles, 24 bitmap-font families; exact source-to-APK resources checked through AAPT2 |
| Selected drawing parts | **16–20**, down from 20–24; includes all complication-type branches conservatively counted |
| Appearance comparison | **384 matching raster frames**, maximum channel difference **2/255**; worst-frame mean difference **0.0206/255** |
| Image work | Default decorative images **12 → 9**; declared rectangle area **−66.3%**; full-canvas opacity groups **3 → 0** |
| Ambient preview coverage | Maximum **7.49%** across all six fonts at 08:08; dim static time only |
| Bounds and motion | Every full-canvas mask including nonzero-alpha glow inside the 210-unit safe radius; translated packet bounds checked; rates, real seconds, midnight continuity and static OFF branches pass |
| Clock | Every 24-hour minute in every font fits the aperture at Large; clock remains centred; shared glyph/time-format/rollover tests pass |
| APK | **623,530 bytes**, up from 601,934; release signature verifies against the project certificate; no DEX, native libraries or permissions; `hasCode=false` |
| Phone installer | Existing 0.7.2 supports this update. Its previous release passed 29 tests; no installer changes or new build in this pass |
| Lint | No errors; 3 intentional duplicate-icon/gap-mask warnings |
| Visual review | Default, eight palettes, six fonts, captioned option tiles, clock/glow sizes, motion poses, low battery, Timer states and ambient gallery generated |

Validator tooling remains pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`. Build toolchain remains AGP 8.12.0, Gradle 8.13, JDK 17 and SDK/build-tools 36.

Reproduce with `bash scripts/release-wear.sh --face nexus --verify-only` and `node tools/check/nexus-optimization.ts`. Local build reports are under `out/verification/nexus`; the review gallery is `out/previews/nexus/index.html`. The new APK and its source-commit/checksum files are in `dist/`. See the [before/after review](../../measurements/reviewed/nexus-0.1.1-optimization.md) for the tradeoff and confidence limits.

These figures do not establish delivered FPS, CPU use, battery savings, Timer availability or working Save/persistence on Samsung's editors. The [device checklist](README.md#phone-installation-and-acceptance) remains open. No watch connection, push or publication was performed during local verification.
