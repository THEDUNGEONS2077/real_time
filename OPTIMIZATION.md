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
| 2026-10-29 (recorded) | NEXUS 0.1.0 | "Looks really good" at default settings/all effects; motion is not smooth enough. Preserve the design and optimize performance | user report |

No controlled trace, frame-rate or battery measurement has been collected yet.

## NEXUS 0.1.1 optimization candidate

The appearance and default motion equations stay unchanged. The new opt-in `RasterOptimizer` crops every mask to nonzero-alpha bounds (including weak glow), combines the four consecutive static console images, and transfers single-image transforms onto `PartImage`. Small orbiting marks retain a parent group because their rotation pivot lies outside their cropped image. Redundant speed-selection containers and the extra black ground draw are removed.

At default Fusion/Slow/all effects, decorative images fall from **12 to 9**, and their total declared rectangle area falls from **1,866,408 to 629,601 pixels (66.3%)**. Three full-canvas opacity groups become direct image opacity. The conservative selected-tree count, including every complication type, falls from **20–24 to 16–20 parts**. These are structural counts; they are not measured GPU time, FPS or battery savings.

Across **384 matching raster comparisons** (eight palettes, four speeds, individual/all-off states and fractional/wrap-adjacent poses), the maximum channel error is **2/255** and the worst frame's mean absolute channel error is **0.0206/255**. This bounds compositing rounding while retaining the accepted composition. The SVG preview now also respects per-instance tint when the same signal bitmap has two colours, matching the actual watch resource semantics.

The tradeoff is one colour-baked console image per palette, replacing four shared mask draws. All moving masks still deduplicate across palettes; glyphs, controls, rates, layout and provider behaviour are unchanged. See [reviewed evidence](measurements/reviewed/nexus-0.1.1-optimization.md) and [release checks](faces/nexus/VERIFICATION.md). Device smoothness confidence remains pending a same-settings comparison on the Watch7.

Future faces can opt into `tools/compose/src/raster.ts`. Compare packed and original raster pixels, preserve painter order and pivots, keep live fields outside the packing pass, and rerun editor/ambient/memory gates. Do not migrate an accepted face solely because a new optimizer exists. Android documents [direct image transforms](https://developer.android.com/reference/wear-os/wff/group/part/image/part-image) and [cropping/image-memory considerations](https://developer.android.com/training/wearables/wff/memory-usage); the optimization is still subject to device testing.

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
