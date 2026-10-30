# VECTOR 0.1.0: navigation design baseline

Reviewed 2026-10-30 for Galaxy Watch7 40 mm / Wear OS 6. Device acceptance is pending; no VECTOR device observations or captures have been collected. Exact firmware/settings are unknown. Comparators: accepted NEXUS 0.1.2, JARVIS 0.1.0 and REACTOR 0.1.0.

**Change and visual tradeoff:** replace REACTOR's armoured bridge and energy cells with open wing brackets, fine course rails, amber vector chevrons and a small diamond reticle. The sparse navigation instrument remains decorative: no invented heading or sensor readout. Time, date, battery and the complication stay fixed. Baked glow/material detail and live-clock image rotation retain the accepted rendering approach.

**Reuse:** flat configurations, captioned icons, stable IDs, shared RGB-selected interactive text, static disabled branches, cropped masks, merged static layers and direct image transforms. Two orbiting images retain parent groups for their external pivots. Accepted face generators and resources remain unchanged.

| Engineering metric | NEXUS 0.1.2 | REACTOR 0.1.0 | VECTOR 0.1.0 |
|---|---:|---:|---:|
| XML bytes | 250,138 | 152,284 | 153,281 |
| Clock declarations | 102 | 60 | 60 |
| Selected drawing parts | 16–20 | 16–18 | 16–18 |
| Default decorative images | 9 | 7 | 7 |
| Default rectangle pixels | 629,601 | 596,710 | 591,327 |
| Official active memory bytes | 13,857,204 | 14,269,776 | 14,851,044 |
| Official ambient memory bytes | 959,576 | 637,908 | 637,908 |
| APK bytes | 614,438 | 586,064 | 568,816 |

The definition grows by 997 bytes and four XML elements versus REACTOR, with the same clock/part/image counts. Artwork geometry and cropped pivot handling determine those changes. Rectangle pixels describe selected image bounds, not total decoded memory or a measured rendering gain. The shared packing approach trades per-palette composite memory for fewer draws.

**Memory tradeoff:** active memory increases by 581,268 bytes (0.55 MiB) versus REACTOR despite the smaller selected rectangle area. It remains within the official 100 MiB budget; ambient passes the 10 MiB limit. Preserve the measured engineering tradeoff without claiming a runtime gain.

**Validation and memory:** 110 tests, deterministic resources, 1,458 packaged editor states and 72 raster comparisons pass. See [signed-build verification](../../faces/vector/VERIFICATION.md) for exact official memory figures, test results, packaging checks and reproduction commands.

**Confidence and next step:** structural counts and host tests support the candidate; no measured latency/FPS/power conclusion is available. Install using phone helper 0.7.5, compare perceived motion with accepted REACTOR/NEXUS, exercise repeated phone editing and Save/persistence, on-watch options and wake/face-switch behaviour. Each new face needs independent acceptance. No diagnostics feature or PC-to-watch connection is added.
