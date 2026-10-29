# Accepted checkpoint: NEXUS 0.1.2

Recorded 2026-10-29. After installing the published editor repair, the user confirmed: **“That fixed it, it's perfect now.”** They requested this checkpoint and the same seamless experience for the next watch face.

## Exact baseline

- Release: [nexus-v0.1.2](https://github.com/THEDUNGEONS2077/real_time/releases/tag/nexus-v0.1.2), build 3.
- Source commit: `bebedda6769e00bb0716a014d2103bdbeebb6c31`.
- APK: `real_time-nexus-v0.1.2.apk`, 614,438 bytes.
- SHA-256: `5c2e5af62a9f921115754777978647c8bcbca55b18a024e4d7c69f4b055bf470`.
- Device: Galaxy Watch7 40 mm / Wear OS 6; phone editing through Galaxy Wearable; existing installer 0.7.2.
- Exact firmware, companion version, selected settings and numerical timings were not supplied.

The published release is the reproducible checkpoint. Keep its tag and artifacts intact; no new binary or version is needed to record acceptance. Future faces get independent modules, packages and releases.

## What is accepted

The user confirms the phone Customize timeout is resolved and accepts the resulting experience. Reliable on-watch editing had already been reported. This establishes the practical responsiveness baseline for future faces. It does not independently certify every provider, firmware combination or detailed checklist item, and supplies no measured FPS or battery result.

## Carry forward

1. **Compact editor definition.** Flat configuration declarations, real captioned icons, accessible labels, stable IDs and Condition-based branches. Share interactive text across palettes instead of multiplying full clock/readout trees by palette × font × glow × size. Follow NEXUS's configuration-only typed RGB selection; retain literal decoration/ambient colours and avoid indexed theme-colour references.
2. **Efficient artwork.** Use the shared `RasterOptimizer` for alpha cropping, static layer merging and direct image transforms where pivots permit. Preserve faint glow, painter order and safe margins. Share masks, bake glow, and keep live text separate.
3. **Resumable motion.** Use the shared live-clock expressions, real-time seconds and independent optional effects. Keep static OFF/Still branches, fixed readable time/readouts and dim static ambient. Default motion and every selectable speed must remain usable.
4. **Regression evidence.** Reproduce resources; check resolved configurations, palette/font/glow/size interactions, OFF/Still, glyphs, bounds and ambient. Validate the actual signed APK, packaged icons/resources, WFF, memory, signatures and absence of code/permissions. Keep a face-specific drawing contract; do not copy NEXUS geometry into a different design's tests.
5. **Device acceptance.** Compare the new face with this checkpoint on the same phone/watch and comparable settings. Exercise repeated phone editor opening, changing options, Save/Cancel/reopen, watch editing, timeout/wake and switching away/back. Resolve regressions before calling the new face seamless. Local resource metrics alone do not establish responsiveness.

## Engineering reference

| Metric | Accepted NEXUS 0.1.2 |
|---|---|
| WFF XML | 250,138 bytes; 3,423 elements; 102 clock declarations |
| Selected drawing parts | 16–20 |
| Default decorative images | 9; total declared rectangle area 629,601 pixels |
| Official memory estimate | 13,857,204 active / 959,576 ambient bytes |
| Editor | 11 settings; 36 option tiles; 24 bitmap-font families |
| Verification | 88 tests; 746 selected editor states; 3,776 interactive + 48 ambient drawing-equivalence states |

These are comparison points, not universal performance thresholds. Explain growth in scene size, part count, textures or memory and check its effect on the device. Retain independent visual styles and the [shared face standard](../FACE_STANDARD.md); use the [optimization record](../OPTIMIZATION.md) and [reviewed evidence](../measurements/reviewed/nexus-0.1.2-editor.md).
