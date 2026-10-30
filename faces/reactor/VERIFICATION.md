# REACTOR 0.1.0 — local verification

Reviewed 2026-10-30. Resource-only WFF 4/API 36, 432×432 coordinates, build 1. Independent package `com.thedungeons2077.realtime.reactor`. Published as `reactor-v0.1.0` from `171cfe96ac21bbd8e57c203a084b5a816a4a67f1`; uploaded APK and provenance files were downloaded and verified against the local artifacts. The user subsequently confirmed the face “looks and runs amazing”, accepting its design and perceived running performance. See the [checkpoint](../../docs/CHECKPOINT-REACTOR-0.1.0.md).

| Check | Result |
|---|---|
| Project checks | TypeScript and **102 tests** pass; all six faces reproduce byte for byte |
| Existing faces | HALO, REDLINE, CIPHER, NEXUS and JARVIS generators/resources unchanged |
| Google WFF validator | Pinned 1.7.0, WFF 4: PASSED |
| Official memory evaluator | 1.5.1: PASS; **14,269,776 active bytes (13.61 MiB)** / **637,908 ambient bytes (0.61 MiB)**; limits 100 / 10 MiB |
| Packaged editor | **1,458 states**, 10 settings, 30 captioned tiles, 16 font families; actual AAPT2 resource-table mapping and packaged pixels/strings checked |
| Colour selection | Every palette × font × glow × size at battery 5/15/16/80; resolved clock/date/battery tint and warning colours checked |
| Definition | **152,284 bytes**, 2,156 XML elements, 60 clock declarations; NEXUS baseline 250,138 bytes / 102 clocks |
| Selected drawing parts | **16–18**, same as JARVIS; all provider-type branches conservatively counted |
| Default decoration | **7 images**, 596,710 declared rectangle pixels, two retained rotation groups for external pivots |
| Packed/source comparison | **72 raster comparisons**: six palettes × four speeds × three poses including fractional/midnight-adjacent time; maximum channel error ≤4/255, mean <0.1/255 |
| Bounds | Every illuminated mask pixel including faint glow stays inside the 210-unit safe radius; centred rotation preserves this bound |
| Time and motion | All minutes/fonts fit at Large; time/readouts stay fixed; independent rates, true seconds, midnight continuity, pulse range and static OFF/Still branches pass |
| Ambient | Static dim time only; maximum preview lit coverage **7.47%** across four fonts |
| APK | **586,064 bytes**; project signing certificate verifies; no executable code/native libraries or permissions; `hasCode=false` |
| Android lint | 0 errors; 3 intentional duplicate-icon/gap-mask warnings |
| Phone installer 0.7.4 | **31 tests** pass, including actual packaged REACTOR selection; signature, INTERNET-only permission, backup exclusion and no added background components verified |
| Visual review | Default and six-palette contact sheet inspected; battery underline moved below the glyphs; fonts, sizes, glow, speeds, effects, motion poses, low battery, midnight/12-hour, provider examples and ambient generated |

The raster comparison starts from white mask pixels and applies RGB tint afterwards, matching WFF's image-tint pipeline. Colouring SVG paths before rasterization introduced premultiplication rounding on the dark metal; correcting the comparison pipeline kept the existing pixel-error tolerances intact. No shared raster implementation or accepted face was changed.

The static metal/clock layers are composited per palette to reduce draws. This raises active memory by 412,572 bytes versus NEXUS and 1,905,288 bytes versus JARVIS, despite the smaller default image rectangle total. These are different metrics: decoded asset memory and selected drawing area. The choice follows the accepted layer-merging approach; no measured GPU, FPS or battery improvement is claimed.

Toolchain remains AGP 8.12.0, Gradle 8.13, JDK 17, SDK/build-tools 36. Google validators: `d1cdafa953c95d5554fc54df4bc3948befbefc4d`. No downloaded or copied reference artwork is used.

Reproduce with `bash scripts/release-wear.sh --face reactor --verify-only`. Reports: `out/verification/reactor`; gallery: `out/previews/reactor/index.html`; signed APK: `dist/real_time-reactor-v0.1.0.apk`. Installer 0.7.4 adds the new package and is verified separately with `bash scripts/release-diagnostics.sh --verify-only`.

The general design/running-performance experience is accepted. Phone opening/Save/reopen, specific wake/face-switch behaviour, Timer availability and individual live fields remain separately unreported. Use the [phone checklist](README.md#phone-installation-and-acceptance) for those details and future regression checks. No numerical FPS, latency or battery result is implied, and no watch-PC connection was used.
