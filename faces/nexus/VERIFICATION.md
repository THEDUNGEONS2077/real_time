# NEXUS 0.1.0 / installer 0.7.2 — local verification

Reviewed 2026-10-28. Resource-only WFF 4, API 36, 432×432 canvas. These results concern the local candidate; publication and Galaxy Watch7 / Galaxy Wearable acceptance are pending.

| Check | Result |
|---|---|
| Project checks | TypeScript passes; 83 tests pass; all four faces reproduce byte for byte |
| Existing faces | HALO's frozen generator and all HALO/REDLINE/CIPHER resources remain unchanged |
| Google XML validator | 1.7.0, WFF 4: PASSED |
| Official memory evaluator | 1.5.1: PASS; 15,844,832 active bytes (**15.11 MiB**), 959,576 ambient bytes (**0.92 MiB**); limits 100 / 10 MiB |
| Packaged editor inspection | **746 states**, 11 settings, 36 option tiles, 24 bitmap-font families; exact source-to-APK resources checked through AAPT2 |
| Selected drawing parts | **20–24**, including all complication-type branches conservatively counted |
| Ambient preview coverage | Maximum **7.49%** across all six fonts at 08:08; dim static time only |
| Bounds and motion | Every full-canvas mask including nonzero-alpha glow inside the 210-unit safe radius; translated packet bounds checked; rates, real seconds, midnight continuity and static OFF branches pass |
| Clock | Every 24-hour minute in every font fits the aperture at Large; clock remains centred; shared glyph/time-format/rollover tests pass |
| APK | Approximately 0.60 MB; release signature verifies against the project certificate; no DEX, native libraries or permissions; `hasCode=false` |
| Phone installer | **29 tests pass**, including actual AAPT2-packaged NEXUS selection; signature/permission/component/library checks pass |
| Lint | No errors. Face: 3 intentional duplicate-icon/gap-mask warnings. Installer: 14 warnings in existing packaging, dependencies and UI; transport/dependencies were not changed |
| Visual review | Default, eight palettes, six fonts, captioned option tiles, clock/glow sizes, motion poses, low battery, Timer states and ambient gallery generated |

Validator tooling remains pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`. Build toolchain remains AGP 8.12.0, Gradle 8.13, JDK 17 and SDK/build-tools 36.

Reproduce with `bash scripts/release-wear.sh --face nexus --verify-only` and `bash scripts/release-diagnostics.sh --verify-only`. Local raw build reports are under `out/verification/nexus` and `out/verification/phone`; the review gallery is `out/previews/nexus/index.html`. APKs and their source-commit/checksum files are in `dist/` and `dist/diagnostics/`.

These figures do not establish delivered FPS, CPU use, battery savings, Timer availability or working Save/persistence on Samsung's editors. The [device checklist](README.md#phone-installation-and-acceptance) remains open. No watch connection, push or publication was performed during local verification.
