# JARVIS 0.1.0: local baseline against NEXUS

Reviewed 2026-10-30. Target Galaxy Watch7 40 mm / Wear OS 6. The user has reported their experience after the 0.1.0 release; no device capture was collected, and exact firmware/settings and phone app versions are unknown. The accepted comparator is NEXUS 0.1.2/source `bebedda6769e00bb0716a014d2103bdbeebb6c31`.

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

**Device acceptance, 2026-10-30:** after publication, the user called JARVIS “awesome”. Asked specifically whether motion and phone customization feel as seamless as NEXUS, they answered “It does yes - really good!” This accepts the design and perceived responsiveness, and supports reuse of the NEXUS architecture in a distinct face. Release source: `e23a4839960d190be548d3006ed0226d2e39d00c`; APK SHA-256: `3606a9737303db6b41a53a1685aeddfa0a66339d6c19db6f232c715a1dc13225`.

**Confidence:** user-confirmed experience on their setup, with the host checks above. No numerical FPS, latency, power measurement or exhaustive provider/lifecycle checklist result is implied. Preserve this release and repeat device acceptance for future changes. NEXUS 0.1.2 remains the named architecture checkpoint.
