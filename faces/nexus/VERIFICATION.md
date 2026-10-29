# NEXUS 0.1.2 — local verification

Reviewed 2026-10-29. Resource-only WFF 4, API 36, 432×432 canvas; build 3. NEXUS 0.1.1 is published. After that delivery the user reported good appearance and reliable on-watch customization, but Galaxy Wearable times out **opening** Customize. Their exact installed version, firmware and phone app version were not supplied. Scene duplication is a suspected contributor, not a confirmed root cause. This build is a local repair candidate; phone acceptance and publication remain pending.

| Check | Result |
|---|---|
| Project checks | TypeScript passes; **88 tests** pass; all four faces reproduce byte for byte |
| Existing resources | HALO/REDLINE/CIPHER unchanged; NEXUS bitmap assets, option icons and strings unchanged |
| Google XML validator | 1.7.0, WFF 4: PASSED, including configuration-only RGB transforms |
| Official memory evaluator | 1.5.1: PASS; **13,857,204 active bytes (13.22 MiB)** and **959,576 ambient bytes (0.92 MiB)**, unchanged from 0.1.1; limits 100 / 10 MiB |
| Packaged editor inspection | **746 states**, 11 settings, 36 option tiles, 24 font families; exact packaged resources verified through AAPT2 |
| Deployed drawing contract | **3,776 interactive + 48 ambient states** match 0.1.1 drawing-instruction hashes: palette/font/glow/size/battery interactions, palette/speed/effect combinations, painter order, motion and provider content |
| Editor compatibility | Entire catalogue hash unchanged; setting IDs, defaults, icons and labels preserved; unknown/missing palette falls back to Fusion |
| XML definition | **446,460 → 250,138 bytes (−44.0%)**; **6,819 → 3,423 elements (−49.8%)**; **480 → 102 clocks (−78.8%)**; Conditions **458 → 234** |
| Selected drawing parts | **16–20**, unchanged; one stationary tint group added around the selected clock |
| Geometry and motion | Exact clock boxes/font sizes, glyph resources, decorative transforms and static OFF branches unchanged; existing motion, bounds and all-time fit tests pass |
| Ambient | Literal-colour clock tree unchanged, no transforms; preview lit coverage maximum **7.49%** |
| APK | **614,438 bytes** (0.1.1: 623,530); release certificate matches; no DEX/native code or permissions; `hasCode=false` |
| Installer | Existing **0.7.2** installs the update; no installer change or new pairing required |
| Lint | 0 errors; 3 existing intentional duplicate-icon/gap-mask warnings |
| Previews | All palette/font/size/glow, low-battery, effect, motion and ambient galleries regenerated |

Pinned Google tooling: `d1cdafa953c95d5554fc54df4bc3948befbefc4d`. Toolchain: AGP 8.12.0, Gradle 8.13, JDK 17, SDK/build-tools 36.

The baseline XML was checked against the packaged XML in the verified published 0.1.1 APK (SHA-256 `e14759e96f10fb74b1f50ae5885e987c4c59d16f72d5295ec2f4beb795ec8271`). Its drawing hashes are committed in `tools/compose/test/fixtures/nexus-0.1.1-drawing-contract.json`; they are not regenerated from candidate output. The safe colour-expression reader also rejects invalid RGB channels, indexed theme references and unsupported/code-like expressions.

Reproduce with `bash scripts/release-wear.sh --face nexus --verify-only`. The new drawing-contract check runs inside `npm run check`, or separately with `python3 -I tools/check/nexus-editor.py`. Reports: `out/verification/nexus`; gallery: `out/previews/nexus/index.html`; signed candidate: `dist/real_time-nexus-v0.1.2.apk`.

The implementation uses documented WFF 4 [Group tint transforms](https://developer.android.com/reference/wear-os/wff/group/group), [BitmapFont colour transforms](https://developer.android.com/reference/wear-os/wff/group/part/text/bitmap-font) and [typed RGB expressions](https://developer.android.com/reference/wear-os/wff/common/attributes/arithmetic-expression). Only the interactive clock inherits a tint group; readouts transform their own colour. Ambient and decorative colours remain literal. There are no indexed theme-colour references, live-clock colour sources or new animation loops.

Instruction equivalence does not prove device pixel equivalence or editor latency. The new tint path requires colour checks on both editors, and Samsung phone opening/Save/persistence remains unconfirmed. No delivered FPS, CPU, battery or renderer-cost improvement is claimed. Follow the [phone checklist](README.md#phone-installation-and-acceptance); no reset, watch-PC connection, push or publication was performed during local verification.
