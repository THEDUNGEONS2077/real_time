# Optimization record

## Evidence policy

Optimize from what the watch actually does. A small APK, a passing validator, the memory estimate or a smooth SVG preview do not show low battery use or smooth delivery. The watch-face runtime is shared, so its CPU is not exclusive to one face. Claim an improvement only after matched device runs.

## What we know

| When | Face | Observation | Kind |
|---|---|---|---|
| 2026-10-24 | HALO 0.1.0 | Installs, renders, "performance good" | user report |
| 2026-10-24 | REDLINE 0.1.0 | White preview/face; fixed in 0.1.1 by literal colours | user report |
| 2026-10-25 | REDLINE 0.2.0 | Blank editor options, motion stopped after a face switch | user report |
| 2026-10-25 | REDLINE 0.2.1 | All customization works, looks good | user report |
| 2026-10-25 | REDLINE 0.3.0 | "Looks very smooth" (clock-refreshed 60 fps transitions) | user report |

No controlled trace, frame-rate or battery measurement has been collected yet.

## Engineering choices (not yet measured)

- **Fewer draw parts.** Long static runs are cached as cropped lossless layers: 325 parts became 26 in 0.2.1, and 14 in 0.3.x. The trade is more decoded image memory.
- **Disabled motion is removed, not hidden.** STILL and OFF effects select static subtrees.
- **Fixed readouts.** Clock, readouts and the complication sit outside every moving group.
- **Glow is baked.** It comes from narrow alpha strokes and pre-rendered glyph glow; nothing blurs at runtime.
- **Resource figures for REDLINE:**

  | Version | Active memory | Ambient memory |
  |---|---|---|
  | 0.3.2 | 22.4 MB | 0.16 MB |
  | 1.0 | 30.0 MB | 1.3 MB |

  The growth in 1.0 is eight fonts × three glow levels of glyph masks. Both versions are well inside the 100 / 10 MB limits.

## How to measure

Use the phone helper (`diagnostics/phone`).

1. **Smoothness.** Use SMOOTHNESS TEST (20 s), three runs per setup.
   - Keep brightness, timeout and wrist position matched, and keep the face on screen.
   - Compare SMOOTH vs DYNAMIC at Slow, then the speeds, then each effect OFF against full motion.
   - Delivered fps and missed frames are the smoothness answer. Renderer CPU is a hint, because the runtime is shared.
2. **Detail.** Use RUN 30-SECOND TRACE when CPU by process is needed.
3. **Battery.** Use a battery test: about 24 h unplugged, AOD off, debugging off between start and finish. Compare against a stock face over a matched day.
4. **Review.** Repeat close or noisy results. Change one thing, then re-measure the whole face.

## Recording a finding

Commit a reviewed summary under `measurements/reviewed/` and add a row here. Include device, firmware, face/helper versions, settings, repeats, results, contamination flags, visual trade-off and confidence. Keep raw captures private.

| Change | Device/build | Evidence | Result | Confidence | Guidance |
|---|---|---|---|---|---|
| none yet | — | — | — | — | measure before claiming |
