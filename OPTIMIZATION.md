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
| 2026-10-29 | NEXUS, following 0.1.1 delivery | "Looks good"; Galaxy Wearable times out **opening** Customize, while on-watch customization works reliably. Exact installed build, firmware and phone app version not supplied | user report |
| 2026-10-29 | NEXUS 0.1.2 | “That fixed it, it's perfect now.” Phone editor repair accepted; user requests this as the seamless-experience checkpoint for future faces | user report |
| 2026-10-30 | JARVIS 0.1.0 | Design “awesome”; explicitly confirms motion and phone customization feel as seamless as NEXUS: “It does yes - really good!” | user report |

No controlled trace, frame-rate or battery measurement has been collected yet.

## NEXUS 0.1.2 accepted companion-editor checkpoint

The observed failure is phone editor startup, not broken on-watch setting selection. Excessive inactive scene duplication is a hypothesis; no Samsung logs establish the cause. Share interactive clocks/readouts across the eight palettes using WFF 4 configuration-only RGB colour transforms. Leave all editor IDs/options/defaults, bitmap assets, exact clock sizes/boxes, decoration/motion and literal ambient trees unchanged. One stationary clock tint group replaces palette-specific clock copies; text has no per-frame colour expression.

XML falls **446,460 → 250,138 bytes (44.0%)**, elements **6,819 → 3,423 (49.8%)**, clock declarations **480 → 102 (78.8%)**, and Conditions **458 → 234**. Resolved drawing instructions match the deployed baseline for **3,776 interactive + 48 ambient states**, including all palette/font/glow/size combinations and the battery warning boundary. This checks instruction equivalence; it does not prove identical device rasterization, faster editor loading, FPS or battery savings. The user subsequently accepted the phone editor repair; exact renderer cost remains unmeasured.

See [verification](faces/nexus/VERIFICATION.md). Official references document [Group tint transforms in WFF 4](https://developer.android.com/reference/wear-os/wff/group/group), [BitmapFont colour transforms](https://developer.android.com/reference/wear-os/wff/group/part/text/bitmap-font), and [typed RGB/ternary expressions](https://developer.android.com/reference/wear-os/wff/common/attributes/arithmetic-expression). The user confirmed the repair on 2026-10-29. Use this approach as the default starting point for new faces, with independent device acceptance; preserve existing accepted faces. See [checkpoint identity and requirements](docs/CHECKPOINT-NEXUS-0.1.2.md).

## NEXUS 0.1.1 optimization candidate

The appearance and default motion equations stay unchanged. The new opt-in `RasterOptimizer` crops every mask to nonzero-alpha bounds (including weak glow), combines the four consecutive static console images, and transfers single-image transforms onto `PartImage`. Small orbiting marks retain a parent group because their rotation pivot lies outside their cropped image. Redundant speed-selection containers and the extra black ground draw are removed.

At default Fusion/Slow/all effects, decorative images fall from **12 to 9**, and their total declared rectangle area falls from **1,866,408 to 629,601 pixels (66.3%)**. Three full-canvas opacity groups become direct image opacity. The conservative selected-tree count, including every complication type, falls from **20–24 to 16–20 parts**. These are structural counts; they are not measured GPU time, FPS or battery savings.

Across **384 matching raster comparisons** (eight palettes, four speeds, individual/all-off states and fractional/wrap-adjacent poses), the maximum channel error is **2/255** and the worst frame's mean absolute channel error is **0.0206/255**. This bounds compositing rounding while retaining the accepted composition. The SVG preview now also respects per-instance tint when the same signal bitmap has two colours, matching the actual watch resource semantics.

The tradeoff is one colour-baked console image per palette, replacing four shared mask draws. All moving masks still deduplicate across palettes; glyphs, controls, rates, layout and provider behaviour are unchanged. See [reviewed evidence](measurements/reviewed/nexus-0.1.1-optimization.md) and [release checks](faces/nexus/VERIFICATION.md). Device smoothness confidence remains pending a same-settings comparison on the Watch7.

Future faces can opt into `tools/compose/src/raster.ts`. Compare packed and original raster pixels, preserve painter order and pivots, keep live fields outside the packing pass, and rerun editor/ambient/memory gates. Do not migrate an accepted face solely because a new optimizer exists. Android documents [direct image transforms](https://developer.android.com/reference/wear-os/wff/group/part/image/part-image) and [cropping/image-memory considerations](https://developer.android.com/training/wearables/wff/memory-usage); the optimization is still subject to device testing.

## Engineering choices (not yet measured)

- **JARVIS 0.1.0 accepted (2026-10-30).** First new face using the accepted NEXUS checkpoint: compact RGB-selected text, cropped/merged reference-inspired instrument masks, direct image transforms and live-clock motion. XML 152,880 bytes, 16–18 selected drawing parts, 11.79 MiB active / 0.61 MiB ambient estimate; existing faces unchanged. These are smaller structural costs, not a measured performance gain. See [comparison](measurements/reviewed/jarvis-0.1.0-baseline.md). The user confirms motion and phone customization feel as seamless as NEXUS; numerical FPS, latency and battery remain unmeasured.
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
| Share palette-independent text; retain cropped/merged artwork and live-clock motion | Galaxy Watch7 40 mm / NEXUS 0.1.2 | User confirmation, 2026-10-29; local checks above | Phone Customize timeout fixed; experience accepted as checkpoint | User-accepted on this setup; exact firmware/timing unreported | Baseline for future faces; validate each on-device |
