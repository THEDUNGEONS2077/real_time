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
| 2026-10-25 | REDLINE 1.0.0 | Smooth and performant; up to ~1 s pause before motion after unlock/swipe | user report |

No controlled trace, frame-rate or battery measurement has been collected yet.

## Engineering choices (not yet measured)

- **Fewer draw parts.** Long static runs are cached as cropped lossless layers: 325 parts became 26 in 0.2.1, and 14 in 0.3.x. The trade is more decoded image memory.
- **Disabled motion is removed, not hidden.** STILL and OFF effects select static subtrees.
- **Fixed readouts.** Clock, readouts and the complication sit outside every moving group.
- **Glow is baked.** It comes from narrow alpha strokes and pre-rendered glyph glow; nothing blurs at runtime.
- **NEXUS 0.1.0 candidate (2026-10-28).** Eleven palette-tinted artwork masks, including one 6×14 signal image reused twice, give 20–24 selected drawing parts. Six fonts/three glow levels fit in the official 15.11 MiB active / 0.92 MiB ambient estimate. Mechanical/code/sweep rates are independent; all periods divide midnight at every speed, and signal wraps fade to zero. The visual tradeoff is sparse code/circuit detail and stationary facets instead of a simulated wallpaper. No delivered-FPS or battery improvement is claimed; watch confidence is pending. See [local evidence](faces/nexus/VERIFICATION.md).
- **Resource figures for REDLINE:**

  | Version | Active memory | Ambient memory |
  |---|---|---|
  | 0.3.2 | 22.4 MB | 0.16 MB |
  | 1.0 | 30.0 MB | 1.3 MB |

  The growth in 1.0 is eight fonts × three glow levels of glyph masks. Both versions are well inside the 100 / 10 MB limits.

## How to evaluate

The user judges smoothness and performance on the watch (decided 2026-10-25; the helper's test tools were removed in installer 0.7.0). When comparing changes:
- Compare one change at a time at the same speed, brightness and wrist position.
- For battery, compare a normal day on the face against a normal day on a stock face, with AOD off.

## Recording a finding

Commit a reviewed summary under `measurements/reviewed/` and add a row here. Include device, firmware, face/helper versions, settings, repeats, results, contamination flags, visual trade-off and confidence. Keep raw captures private.

| Change | Device/build | Evidence | Result | Confidence | Guidance |
|---|---|---|---|---|---|
| none yet | — | — | — | — | measure before claiming |
