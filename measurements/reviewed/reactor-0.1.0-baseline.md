# REACTOR 0.1.0: industrial design baseline

Reviewed 2026-10-30 for Galaxy Watch7 40 mm / Wear OS 6. After publication the user reported: **“It looks and runs amazing! Continue in the direction you are heading!”** Design and perceived running performance are accepted. No device captures were collected; exact firmware/settings are unknown. Comparators: accepted NEXUS 0.1.2 and JARVIS 0.1.0. See the [release identity and checkpoint](../../docs/CHECKPOINT-REACTOR-0.1.0.md).

**Change and visual tradeoff:** replace JARVIS's open circular core with an opaque titanium clock bridge, machined fasteners, asymmetric amber cell bundles and a restrained red containment ring. Preserve clear fixed time, neutral information rows, independent live-clock carriers and the compact editor. Material shading and glow are baked pixels; the face has no runtime filter or procedural shader.

**Reuse:** accepted flat configurations, captioned icons, stable option IDs, explicit RGB text, static disabled branches, cropped masks, merged static layers and direct image transforms. Existing face source/resources remain unchanged. Clock/readout geometry is inherited from accepted JARVIS.

| Engineering metric | NEXUS 0.1.2 | JARVIS 0.1.0 | REACTOR 0.1.0 |
|---|---:|---:|---:|
| XML bytes | 250,138 | 152,880 | 152,284 |
| Clock declarations | 102 | 60 | 60 |
| Selected drawing parts | 16–20 | 16–18 | 16–18 |
| Default decorative images | 9 | 7 | 7 |
| Default rectangle pixels | 629,601 | 617,668 | 596,710 |
| Official active memory bytes | 13,857,204 | 12,364,488 | 14,269,776 |
| Official ambient memory bytes | 959,576 | 637,908 | 637,908 |
| APK bytes | 614,438 | 523,543 | 586,064 |

**Memory tradeoff:** per-palette metal/bridge composites consume more decoded memory while retaining fewer draws. The extra 0.39 MiB versus NEXUS / 1.82 MiB versus JARVIS is recorded rather than described as an unconditional optimization. The official active/ambient limits pass; running performance is user-accepted, while numerical runtime cost remains unmeasured.

**Validation:** 102 tests, deterministic generation, 1,458 editor states, 72 raster comparisons, WFF/memory, signatures, packaged-resource equality and no-code/no-permission checks. See [verification](../../faces/reactor/VERIFICATION.md).

**Confidence and reuse:** user-confirmed design and perceived running performance on their setup, supported by the local checks above. Preserve the published face and carry its design/rendering principles forward. No measured latency/FPS/power conclusion or exhaustive editor/provider/lifecycle coverage is implied; detailed checks remain unreported. Future faces require independent device acceptance. No diagnostics feature or PC-to-watch connection is added.
