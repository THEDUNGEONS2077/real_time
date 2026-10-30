# JARVIS 0.1.0 — local verification

Reviewed 2026-10-30. Resource-only WFF 4/API 36, 432×432 coordinates, build 1. Independent package `com.thedungeons2077.realtime.jarvis`. Publication and device acceptance are pending. This face reuses the accepted NEXUS 0.1.2 architecture; it does not yet have NEXUS's user acceptance.

| Check | Result |
|---|---|
| Project checks | TypeScript and **95 tests** pass; all five faces reproduce byte for byte |
| Existing faces | HALO, REDLINE, CIPHER and accepted NEXUS source/resources unchanged |
| Google WFF validator | Pinned 1.7.0, format 4: PASSED |
| Official memory evaluator | 1.5.1: PASS; **12,364,488 active bytes (11.79 MiB)** and **637,908 ambient bytes (0.61 MiB)**; limits 100 / 10 MiB |
| Packaged editor inspection | **1,458 states**, 10 settings, 30 option tiles, 16 font families; source-to-APK resources checked through AAPT2 |
| Text/editor colour checks | Every palette × font × glow × size at battery 5/15/16/80; time, date and warning colours checked after resolving configuration-only transforms |
| Editor definition | **152,880 bytes**, 60 clock declarations; accepted NEXUS baseline: 250,138 bytes, 102 clocks |
| Selected drawing parts | **16–18**, including all provider-type branches conservatively counted; NEXUS 16–20 |
| Default decoration | **7 images**, 617,668 declared rectangle pixels, 2 retained rotation groups for external pivots |
| Packed appearance | **72 raster comparisons**, six palettes × four speeds × three poses including fractional/midnight-adjacent time; channel error ≤4/255 and mean error <0.1/255 |
| Bounds | Every nonzero-alpha mask pixel, including faint glow, stays inside the 210-unit safe radius; centred rotation preserves this bound |
| Clock and motion | Every minute/every font fits at Large; fixed rows remain separate; rotation rates, true seconds, midnight continuity, pulse bounds and static OFF/Still pass |
| Ambient | Dim static time only; maximum preview lit coverage **7.48%** over the four fonts |
| Signed APK | **523,543 bytes**; project certificate verifies; no DEX/native libraries or permissions; `hasCode=false` |
| Android lint | 0 errors, 3 intentional duplicate-icon/gap-mask warnings |
| Phone installer 0.7.3 | **30 tests** pass, including actual packaged JARVIS selection; release signature, INTERNET-only permission, backup exclusion and absence of new background components checked |
| Visual review | Default and six-palette contact sheet inspected; all fonts/sizes/glow, speed/effect states, poses, low battery, 12-hour/midnight, provider examples and ambient gallery generated |

Toolchain: AGP 8.12.0, Gradle 8.13, JDK 17, SDK/build-tools 36. Google validators remain pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`.

The supplied JARVIS reference is read locally and aligned in the gallery. It is not committed or packaged. The face uses eight independently authored white-alpha masks, pinned font glyphs and the same palette/geometry/motion inputs for WFF and previews.

Reproduce with `bash scripts/release-wear.sh --face jarvis --verify-only`. Reports: `out/verification/jarvis`; gallery: `out/previews/jarvis/index.html`; face APK: `dist/real_time-jarvis-v0.1.0.apk`. Installer 0.7.3 is required to recognize the new package and is verified separately with `bash scripts/release-diagnostics.sh --verify-only`.

These local checks establish packaging and design contracts, not phone opening latency, delivered FPS, battery use or Timer availability. Compare against accepted NEXUS on the same phone/watch using the [device acceptance checklist](README.md#phone-installation-and-acceptance). No PC-to-watch connection or publication was used during verification.
