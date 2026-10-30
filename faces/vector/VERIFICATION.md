# VECTOR 0.1.0 — local verification

Reviewed 2026-10-30. Resource-only WFF 4/API 36, 432×432 coordinates, build 1. Independent package `com.thedungeons2077.realtime.vector`. Publication and phone/watch acceptance are pending. REACTOR/NEXUS acceptance guides this design; it does not establish VECTOR's delivered responsiveness.

| Check | Result |
|---|---|
| Project checks | TypeScript and **110 tests** pass; all seven faces reproduce byte for byte |
| Existing faces | HALO, REDLINE, CIPHER, NEXUS, JARVIS and REACTOR generators/resources unchanged |
| Google WFF validator | Pinned 1.7.0, WFF 4: PASSED |
| Official memory evaluator | 1.5.1: PASS; **14,851,044 active bytes (14.16 MiB)** / **637,908 ambient bytes (0.61 MiB)**; limits 100 / 10 MiB |
| Packaged editor | **1,458 states**, 10 settings, 30 captioned tiles, 16 font families; actual AAPT2 resource-table mapping and packaged pixels/strings verified |
| Colour selection | Every palette × font × glow × size at battery 5/15/16/80; resolved clock/date/battery tint and warning colours checked |
| Definition | **153,281 bytes**, 2,160 XML elements, 60 clock declarations |
| Selected drawing parts | **16–18**, same as REACTOR; all provider-type branches conservatively counted |
| Default decoration | **7 images**, 591,327 declared rectangle pixels; two retained rotation groups for external pivots |
| Packed/source comparison | **72 raster comparisons**, six palettes × four speeds × three poses; maximum channel error ≤4/255, mean <0.1/255; white-mask rasterization then RGB tint matches WFF's pipeline |
| Bounds | Every illuminated mask pixel including faint glow stays inside the 210-unit radius; centred rotation preserves this bound |
| Time and motion | All minutes/fonts fit at Large; fixed readouts; 12/24-hour midnight/noon, year/date rollover, battery text extremes, independent motion rates, midnight continuity, pulse range and static OFF/Still branches pass |
| Ambient | Static dim time only; all 24 palette/font combinations checked; maximum preview lit coverage **7.48%** |
| Signed APK | **568,816 bytes**; project certificate verifies; no executable code/native libraries or permissions; `hasCode=false` |
| Android lint | 0 errors; 3 intentional duplicate-icon/gap-mask warnings |
| Phone installer 0.7.5 | **32 tests** pass, including actual packaged VECTOR selection; signature, INTERNET-only permission, backup exclusion and no added background components verified |
| Visual review | Default, palette contact sheet, Large clock, low battery, editor icons and ambient inspected; every option, motion poses, 12-hour/midnight and provider examples generated |

APK SHA-256: `6af4d55935e6f94ec1fa36b498aee03c72a59b2f649641998081ca44c85d8a31`.

The selected image rectangle area is slightly below REACTOR, but official active memory is **581,268 bytes (0.55 MiB) higher**. These metrics measure different things: selected draw bounds versus decoded assets across supported configurations. Per-palette static composites retain fewer draws at a modest memory cost. No unconditional optimization, measured FPS, latency or battery gain is claimed. See [comparison](../../measurements/reviewed/vector-0.1.0-baseline.md).

Toolchain: AGP 8.12.0, Gradle 8.13, JDK 17, SDK/build-tools 36. Google validators remain pinned to `d1cdafa953c95d5554fc54df4bc3948befbefc4d`. Original SVG artwork only; no reference bitmap or external artwork is packaged.

Reproduce with `bash scripts/release-wear.sh --face vector --verify-only`. Reports: `out/verification/vector`; gallery: `out/previews/vector/index.html`; signed APK: `dist/real_time-vector-v0.1.0.apk`. Installer 0.7.5 adds the package; its independent verification uses `bash scripts/release-diagnostics.sh --verify-only` and writes `out/verification/phone`.

The user must still check perceived motion, repeated phone editor opening and Save/Cancel/persistence, on-watch controls, wake/face-switch behaviour, Timer availability and live data using the [phone checklist](README.md#phone-installation-and-acceptance). No watch-PC connection was used.
