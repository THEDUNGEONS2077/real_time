# NEXUS 0.1.2: accepted companion editor checkpoint

Reviewed 2026-10-29 against published 0.1.1 (source `60ce274c6937da7240c28a03b112fe0e57b74419`). Target: Galaxy Watch7 40 mm, Wear OS 6. Installer remains 0.7.2. Exact watch firmware, phone/companion versions and installed face version were not supplied.

**Observed:** following 0.1.1 delivery, the user says the face looks good and watch customization works reliably. Galaxy Wearable times out while **opening** Customize. No timings, logs, trace or battery measurements were collected. This distinguishes a companion-opening failure from the family's older broken-setting-selection problem.

**Change:** share interactive text across palettes. A stationary parent tints white clock glyphs using WFF 4 configuration-only `colorRgb` expressions. Readout font colours use the same palette constants directly. Keep the existing 11 settings, 36 options, stable IDs, defaults, literal decoration/ambient colours, clock size/geometry and motion. No asset changes or feature removal. The potential tradeoff is the renderer's handling/cost of the new clock tint group; local checks cannot establish that cost.

**Local result:** XML shrinks 446,460 → 250,138 bytes; parsed elements 6,819 → 3,423; clocks 480 → 102. Drawing instructions match 0.1.1 over 3,776 interactive and 48 ambient states. Selected parts remain 16–20. Official memory remains 13,857,204 active / 959,576 ambient bytes. APK shrinks 623,530 → 614,438 bytes. WFF, package, signature, resource reproduction and 88 tests pass. See [verification](../../faces/nexus/VERIFICATION.md).

**Device outcome, 2026-10-29:** after 0.1.2 publication, the user confirmed “That fixed it, it's perfect now.” They requested this version as the checkpoint and the same seamless experience for the next face. This is user acceptance of the timeout repair and resulting experience; exact timings/settings and individual checklist results were not supplied.

**Confidence:** supported by the user report on their Galaxy Watch7/phone and by the structural checks. The specific Samsung timeout mechanism remains inferred. No measured FPS or battery conclusion. Carry this architecture into new faces and verify each on-device; keep existing accepted releases intact. See [exact checkpoint identity and reuse requirements](../../docs/CHECKPOINT-NEXUS-0.1.2.md).

**Regression procedure for future changes:** update in place with installer 0.7.2; open the phone editor three times; save Fusion/Blood/Outrun and reopen to check persistence. Verify time/date/battery colour, then font/glow/size, motion after exit/wake/face switch, and agreement with the watch editor. Record versions and approximate opening times. If the timeout remains, compare phone editor opening with REDLINE/CIPHER under the same connection before choosing another change. No data clearing or re-pairing.
