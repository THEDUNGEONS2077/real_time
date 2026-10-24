# Shared optimization record

## Evidence policy

Optimize from measured watch behaviour. A small APK, WFF validation, estimated memory or a smooth SVG preview does not demonstrate low battery use. A shared renderer's UID may account for several system responsibilities; its cost is not exclusive to the selected face.

Every future face uses the shared collector, metadata and report format. Read reviewed findings here before adding a costly effect, then measure the new face because geometry, display brightness, firmware and interactive time can change the outcome.

The preferred collection interface is now the local phone helper: run, review, copy and paste. It embeds the same collector and runs analysis after disconnecting the watch. Add future faces to its setup catalogue so face/build/palette/effect records remain accurate. Keep real comparisons and reviewed findings in this record; no pasted data becomes a claimed win without reviewing conditions and repeating noisy results.

## Current findings

No on-watch performance or battery captures have been collected yet. There are no measured optimization wins to reuse yet.

On 2026-10-24 the user supplied a successful HALO installation/version-verification report, confirmed the face displays on their Watch7 and described its performance as good. This is a qualitative device observation, without controlled trace, jank or battery measurements. It supports reusing the resource-only approach; it does not establish a measured energy saving or validate REDLINE's faster motion.

REDLINE's initial resource evaluation passes at 3,204,224 active bytes and 38,016 ambient bytes. Its reference-red strokes and pre-rendered masks avoid runtime blur, while stable readouts sit outside rotating groups. These are implementation/resource findings, not measured power results. Follow the same experiment sequence below for REDLINE, using its own rotor/pulse/instrument/radar labels and selecting REDLINE in the phone helper. Consult [its design](faces/redline/README.md) for the precise profile and tradeoffs.

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
