# Shared optimization record

## Evidence policy

Optimize from measured watch behaviour. A small APK, WFF validation, estimated memory or a smooth SVG preview does not demonstrate low battery use. A shared renderer's UID may account for several system responsibilities; its cost is not exclusive to the selected face.

Every future face uses the shared collector, metadata and report format. Read reviewed findings here before adding a costly effect, then measure the new face because geometry, display brightness, firmware and interactive time can change the outcome.

The preferred collection interface is now the local phone helper: run, review, copy and paste. It embeds the same collector and runs analysis after disconnecting the watch. Add future faces to its setup catalogue so face/build/palette/effect records remain accurate. Keep real comparisons and reviewed findings in this record; no pasted data becomes a claimed win without reviewing conditions and repeating noisy results.

## Current findings

No on-watch performance or battery captures have been collected yet. There are no measured optimization wins to reuse yet.

On 2026-10-24 the user supplied a successful HALO installation/version-verification report, confirmed the face displays on their Watch7 and described its performance as good. This is a qualitative device observation, without controlled trace, jank or battery measurements. It supports reusing the resource-only approach; it does not establish a measured energy saving or validate REDLINE's faster motion.

REDLINE's initial resource evaluation passes at 3,204,224 active bytes and 38,016 ambient bytes. Its reference-red strokes and pre-rendered masks avoid runtime blur, while stable readouts sit outside rotating groups. These are implementation/resource findings, not measured power results. Follow the same experiment sequence below for REDLINE, using its own rotor/pulse/instrument/radar labels and selecting REDLINE in the phone helper. Consult [its design](faces/redline/README.md) for the precise profile and tradeoffs.

Device acceptance subsequently failed for REDLINE 0.1.0: the user reports white output in preview and applied mode, with HALO rendering normally after switching back. This is a functional failure, despite the passing resource checks. The user subsequently confirmed REDLINE 0.1.1 renders correctly and looks good after removal of its fixed-palette runtime lookup. They describe the motion as less smooth than desired. This resolves the observed white-screen symptom for that build, without proving its root cause or establishing a frame-rate/battery metric.

REDLINE 0.2.0 offers a Smooth mode requesting native 30 fps linear rotation, the original Dynamic profile, and 0.5×/1×/2× speeds plus Still. Smoother frame delivery and any power tradeoff remain unverified. Compare Smooth and Dynamic at the same speed, palette and conditions, using three captures each; then compare speeds separately. The analyzer records and flags differing speed/style conditions so a comparison needs explicit interpretation. Keep these fields in future face workflows where controls exist.

Implementation choices awaiting measurement:

- Prefer vector geometry and small, tightly bounded masks.
- Use the slowest suitable data source; a bounded phase avoids large arithmetic inputs but does not lower source update frequency.
- Remove disabled motion from the selected tree, rather than merely making it transparent.
- Keep tilt off text and touch targets.
- Keep ambient static and minimal, even though the intended configuration has AOD off.

These are engineering hypotheses and resource constraints, not measured battery savings.

## Experiment sequence

1. Full HALO, all effects on: three 30-second captures.
2. All seven optional effects off: three captures under the same conditions.
3. Disable each effect separately from full HALO: three captures per effect. Use the same visibility duration, brightness, timeout, palette, connectivity and wrist motion; counterbalance the order across repeats.
4. Compare a stock face and full HALO over matched 24-hour periods with AOD off. Disconnect debugging between endpoints and record normal use, workouts, notifications and unusual conditions.
5. Inspect available metrics, uncertainty and visual tradeoffs. Repeat close/noisy results. Change one thing, repeat its comparison, then check the whole face again.

No fixed battery cutoff or automatic motion reduction is imposed. The user reviews measured tradeoffs before changing the chosen full-motion default.

## Recording a reviewed finding

Commit a reviewed summary under `measurements/reviewed/` and add a row below. Include device model, firmware, face and source commits, experiment settings, repetitions, capture IDs, observed baseline/candidate values, contamination flags, visual effect, confidence and recommendation. Keep identifying/raw data out of the summary. Record regressions and inconclusive results too.

| Change | Device/build | Evidence | Result | Confidence | Future-face guidance |
|---|---|---|---|---|---|
| No device findings yet | — | — | — | — | Measure before claiming a benefit |

After an accepted change, update DESIGN.md and CHANGELOG.md with the resulting behaviour and link its reviewed evidence. Do not transfer a measured numeric saving to a different face without another measurement.

## REDLINE 0.2.1 engineering pass (2026-10-25)

The user reports 0.2.0 has unusable blank options on both editors and motion stops after switching faces. Its resource checks did not establish functional acceptance. Missing editor icons and unsupported nesting are corrected in the candidate; native repeating loops are replaced by live clock expressions. The exact on-device behaviour of this repair still requires testing.

Cached cropped artwork reduces the same revised source scene from 325 separate parts to 26; the complete selected WFF has at most 32 parts under the checker, conservatively including every Timer-provider branch. Generated XML decreases from 4,496,431 bytes to 446,118 (about 90%). These are reproducible structural metrics. Caching uses decoded image memory and slightly different subpixel raster antialiasing; equivalence tests cover six palettes at representative rotation/tilt states. No CPU, FPS, jank or battery improvement is inferred from these counts.

The 100% larger clock and repositioned instruments are a separate requested visual change, not a controlled energy comparison. Compare the new full-motion build against Still and individual effects first; record brightness, visibility and the larger lit area before interpreting battery results. No battery saving is claimed. Smooth now means steady clock-driven rotation, with no native FPS request. Re-entry and timeout/wake must pass before accepting the rendering lifecycle.

All future faces follow FACE_STANDARD.md and use the same measurement workflow, explicit editor contract and packaged resource verification.

Official evaluation of the 0.2.1 candidate records 25,917,536 maximum active bytes (about 24.7 MiB) and 38,016 ambient bytes, within 100 MiB/10 MiB limits. This is a larger evaluated image-memory footprint, traded for fewer selected drawing parts; real renderer CPU/jank and whole-watch battery remain unavailable. Ambient preview coverage is about 4.82% with the doubled clock, below the 10% preview guardrail.

## User acceptance and 0.3.0 candidate (2026-10-25)

The user confirms all REDLINE 0.2.1 customization works and the face looks good. This accepts the reported editor repair qualitatively on their setup. It does not establish individual restart/cancel tests, FPS, jank or battery results. They request a simpler layout and smoother 0.5× rotation.

The new design removes three instruments and uses 14 cached scene parts, compared with 26 in 0.2.1. Official evaluated memory decreases from 25,917,536 to 22,230,640 active bytes; ambient becomes 97,280 bytes because flatter glyphs are now authored at their displayed resolution. Ambient preview coverage is about 3.47%. These are resource metrics only.

Smooth requests 60 fps, one-second linear transitions between clock-refreshed targets; it never uses repeat=-1. At 0.5×, ideal outer/inner speeds are 10°/s and 15°/s: a 60 fps delivery would mean about 0.58/0.79 pixel tangential steps at their track radii. Those are calculations, not observed frames. The first second after activation may settle to phase. Native frame limits, wake/re-entry, visible smoothness and energy must be checked on the watch. The fallback Dynamic mode remains clock-expression based.

Hold speed at Slow when comparing Smooth and Dynamic, repeat three traces each and select the actual renderer/layer before interpreting timing. Faster requested cadence may increase work even though there are fewer parts. Keep the known-working editor architecture; do not infer a battery improvement or force an unrelated battery cutoff.
