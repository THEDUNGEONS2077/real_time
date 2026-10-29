# NEXUS 0.1.1 optimization review

Recorded 2026-10-29. Baseline: published NEXUS 0.1.0/build 1 (`9800aa2`). Candidate: 0.1.1/build 2. Target: Galaxy Watch7 40 mm / Wear OS 6; exact firmware, brightness and power state were not supplied.

## Device observation and scope

The user reports that 0.1.0 looks really good with all default settings but is not smooth enough. They want the accepted design preserved while performance is improved. No trace, delivered frame-rate result or matched battery run is available. This review records local engineering evidence, not a measured device improvement.

Default comparison settings are Fusion, Oxanium/Medium/Low glow, Slow 0.5× and all six effects on. Normal use assumes AOD off; ambient still has its own validation. Every setting ID/default, time/readout glyph, motion rate and complication behaviour stays unchanged.

## Implementation

- Crop images to every nonzero-alpha pixel, retaining one transparent pixel for filtering. Weak baked glow is included; no resampling or resolution reduction is used.
- Combine four consecutive static console images in painter order into one colour-baked layer per palette. Moving masks continue to share resources across palettes.
- Apply translation/opacity and in-bounds rotation directly to single images. The two tiny signal images and glass-light image no longer need full-canvas opacity groups. Orbiting seconds/sweep retain parent rotation because their centre is outside the crop.
- Remove redundant speed-selection containers and the duplicate black ground draw. Empty Still branches retain the named empty Group required by WFF's schema.
- Render previews from the same packed pixels, including per-instance tint for the shared two-colour signal mask.

## Local results

| Metric | 0.1.0 | 0.1.1 candidate |
|---|---:|---:|
| Default decorative images | 12 | 9 |
| Sum of declared decorative image rectangle areas | 1,866,408 px | 629,601 px (−66.3%) |
| Decorative groups with live opacity | 3 | 0 |
| Decorative motion groups | 7 | 2 (five become direct image transforms) |
| Selected drawing parts, all provider branches conservatively counted | 20–24 | 16–20 |
| Official maximum active estimate | 15,844,832 bytes / 15.11 MiB | 13,857,204 bytes / 13.22 MiB (−12.5%) |
| Official maximum ambient estimate | 959,576 bytes / 0.92 MiB | 959,576 bytes / 0.92 MiB |
| Signed APK size | 601,934 bytes | 623,530 bytes (+3.6%) |
| Generated XML bytes | 465,838 | 446,460 |

The APK grows by about 22 KB because each palette gets a precomposited two-colour console layer. The official active-memory estimate still decreases. Rectangle area is a structural metric: the platform may already optimize some transparent pixels or groups internally, so it cannot be converted into a GPU-time or FPS improvement.

384 comparisons cover eight palettes, all four speeds, each effect disabled, all effects disabled, fractional movement, opacity extrema and a pose next to midnight. They compare original raster masks and packed layers with identical expressions. Worst-frame mean absolute channel error: **0.0205636/255**. Maximum channel difference: **2/255**. The original layout and motion remain within 8-bit compositing rounding.

87 project tests, deterministic generation for all four faces, 746 packaged editor states, Google's pinned WFF 4 validator/memory evaluator, signature, no-code/no-permission and lint checks pass. Existing face resources remain byte-identical. Installer 0.7.2 already accepts the update; no installer changes or new diagnostics are needed.

## Confidence and next comparison

High confidence in the reported structural counts, resource estimates and pixel equivalence. Device smoothness, frame pacing and battery benefit remain unconfirmed. Compare 0.1.1 at the same settings, brightness and power state against the observed 0.1.0 experience. Check several wake/unlock and face-switch cycles as well as continuous motion, then record the user's observation without inventing FPS.

Reproduce with `node tools/check/nexus-optimization.ts` and `bash scripts/release-wear.sh --face nexus --verify-only`. Local detailed comparisons are in `out/optimization/nexus/comparison.json`; signed-package checks are in `out/verification/nexus`. No PC-to-watch connection was made.

The reusable mechanism is `tools/compose/src/raster.ts`. Consult this evidence before opting another face in; preserve image order, pivot position, alpha bounds and every control, then compare pixels and memory again. Primary references: [WFF image transforms](https://developer.android.com/reference/wear-os/wff/group/part/image/part-image), [image cropping and memory accounting](https://developer.android.com/training/wearables/wff/memory-usage).
