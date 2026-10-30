# Accepted design and performance checkpoint: REACTOR 0.1.0

Recorded 2026-10-30. After delivery, the user confirmed: **“It looks and runs amazing! Continue in the direction you are heading!”** This accepts REACTOR's appearance and perceived running performance and endorses this direction for future designs.

## Exact baseline

- Release: [reactor-v0.1.0](https://github.com/THEDUNGEONS2077/real_time/releases/tag/reactor-v0.1.0), build 1.
- Source: `171cfe96ac21bbd8e57c203a084b5a816a4a67f1`.
- APK: `real_time-reactor-v0.1.0.apk`, 586,064 bytes.
- SHA-256: `057d568422f5d4b7dca44445c9f4377c5447c2f75d36138286c8736378837fed`.
- Target setup: Galaxy Watch7 40 mm / Wear OS 6. Delivered with phone installer 0.7.4; exact installed installer version, firmware and selected settings were not reported.

Preserve this release's source, resources and artifacts. This documentation records acceptance without changing a binary or version. NEXUS 0.1.2 remains the [phone-editor architecture checkpoint](CHECKPOINT-NEXUS-0.1.2.md); REACTOR adds an accepted industrial design and perceived-performance reference.

## Carry forward

- Large stationary, centred time; clearly separated date and battery; mechanical detail arranged around readable information.
- Distinct silhouettes and palettes within the same HUD language. REACTOR's titanium plates, amber energy and restrained red accents are one expression, not mandatory artwork for every face.
- Slow counter-rotation, subtle baked glow, live-clock motion and independent static OFF/Still branches. Keep moving decoration behind the information plane.
- Compact flat editing metadata, shared interactive text, cropped masks, merged static layers and direct image transforms where pivots permit. Keep the [shared face standard](../FACE_STANDARD.md) and independent validation/device acceptance for each new face.

## Evidence and limits

User feedback establishes design and perceived running-performance acceptance. It does not separately confirm phone editor Save/Cancel/persistence, every option, wake/switch/restart lifecycle, Timer availability or ambient behaviour. Those detailed checks remain unreported; no numerical FPS, latency or battery result is inferred.

Local verification records 102 tests, 1,458 editor states, 72 raster comparisons, WFF validity, signatures and resource-only packaging. Definition: 152,284 bytes / 60 clocks; selected scene: 16–18 drawing parts and 7 default decorative images; official memory estimate: 14,269,776 active / 637,908 ambient bytes. See [verification](../faces/reactor/VERIFICATION.md) and [resource tradeoffs](../measurements/reviewed/reactor-0.1.0-baseline.md).
