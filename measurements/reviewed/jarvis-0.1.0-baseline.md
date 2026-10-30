# JARVIS 0.1.0: local baseline against NEXUS

Reviewed 2026-10-30. Target Galaxy Watch7 40 mm / Wear OS 6. No device capture or installed-version report exists yet; exact firmware and phone app versions are unknown. The accepted comparator is NEXUS 0.1.2/source `bebedda6769e00bb0716a014d2103bdbeebb6c31`.

**Design tradeoff:** concentrate the reference's broad cyan sectors, index windows and technical grid around a readable fixed core. Four fonts and six palettes retain variety while keeping the editor smaller. Five independent moving carriers use the accepted live-clock approach. No simulated telemetry, runtime blur, wallpaper shader or copied reference bitmap is present.

**Architecture:** NEXUS's flat editor metadata, shared interactive text, explicit RGB selection, cropped/merged artwork and direct image transforms. JARVIS's two small orbiting marks retain their valid external pivots through parent groups. Static OFF branches remove decorative time sources. The accepted NEXUS release itself remains unchanged.

| Host metric | NEXUS 0.1.2 | JARVIS 0.1.0 |
|---|---:|---:|
| WFF XML bytes | 250,138 | 152,880 |
| Clock declarations | 102 | 60 |
| Selected drawing parts | 16–20 | 16–18 |
| Default decorative images | 9 | 7 |
| Default image rectangle pixels | 629,601 | 617,668 |
| Official active memory bytes | 13,857,204 | 12,364,488 |
| Official ambient memory bytes | 959,576 | 637,908 |
| APK bytes | 614,438 | 523,543 |

**Validation:** 95 project tests, deterministic resources, 1,458 editor states, 72 packed/source raster comparisons, WFF, memory, signature, no-code and no-permission checks pass. See [verification](../../faces/jarvis/VERIFICATION.md).

**Confidence and next step:** these are engineering metrics, not measured speed or power. They support proceeding to phone installation and comparison; they do not establish seamless editing. Check repeated Galaxy Wearable opening/Save/reopen, on-watch editing, colours and motion after wake/face switches before accepting JARVIS. Use the install-only phone helper 0.7.3; no PC connection, re-pairing or diagnostics collection is required.
