# real_time

Moving sci-fi HUD watch faces for the Samsung Galaxy Watch7 40 mm (Wear OS 6). Each face is a Watch Face Format 4 APK with resources only: no code and no permissions. The system draws it.

| Face | Status | Docs |
|---|---|---|
| **JARVIS** 0.1.0 | User-accepted cyan turbine HUD; motion and phone customization confirmed as seamless as NEXUS | [faces/jarvis/README.md](faces/jarvis/README.md) |
| **NEXUS** 0.1.2 | User-accepted checkpoint: phone customization timeout resolved; responsiveness baseline for future faces | [faces/nexus/README.md](faces/nexus/README.md) |
| **REDLINE** 1.1 | Black/red concentric HUD. 8 clock fonts, glow and size, 6 palettes, 4 speeds, 3 rotation styles, 6 effects, Timer complication | [faces/redline/README.md](faces/redline/README.md) |
| **CIPHER** 0.1.0 | Green phosphor terminal HUD: rotating rings of matrix glyphs, comet sweep, matrix rain. Built light: one image per moving piece | [faces/cipher/README.md](faces/cipher/README.md) |
| **HALO** 0.1.0 | Cyan/amber dot-matrix HUD (frozen) | [DESIGN.md](DESIGN.md) |

The [phone installer](diagnostics/phone/README.md) sends a face APK from the phone to the watch. New faces follow [FACE_STANDARD.md](FACE_STANDARD.md). See [ARCHITECTURE.md](ARCHITECTURE.md) for how the generator works and [OPTIMIZATION.md](OPTIMIZATION.md) for what has been measured.

Use the [NEXUS 0.1.2 checkpoint](docs/CHECKPOINT-NEXUS-0.1.2.md) for the next face's rendering/editor architecture and seamless-experience acceptance target.

The [2026-10-28 takeover review](docs/HANDOVER-2026-10-28.md) traces the latest deployments and the decisions carried into NEXUS. NEXUS needs installer 0.7.2 or later.

JARVIS needs installer **0.7.3** or later; update the helper on the phone before selecting its APK. Pairing is preserved.

## Develop

Requirements: Node 24+, JDK 17, Android SDK platform and build-tools 36.

```bash
npm ci --ignore-scripts
npm run compose          # regenerate every face's resources from tools/compose
npm run check            # types, tests, byte-for-byte reproduction, preview galleries
```

Open `out/previews/nexus/index.html`, `out/previews/redline/index.html` or `out/previews/cipher/index.html` (or `out/previews/index.html` for HALO) directly in a browser; no server is needed.

## Signed builds

```bash
node scripts/setup-signing.mjs        # once; back up keys/real_time-release.jks + keystore.properties privately
bash scripts/setup-validators.sh      # Google's pinned WFF validator and memory evaluator
bash scripts/release-wear.sh --face redline --verify-only
bash scripts/release-wear.sh --face cipher --verify-only
bash scripts/release-wear.sh --face nexus --verify-only
bash scripts/release-diagnostics.sh --verify-only
```

Verify-only builds `dist/` artifacts and reports under `out/verification/` without touching GitHub. Pushing and publishing a prerelease (`--prerelease --publish`) happen only after the user approves.

## Install and test

1. Download the face APK (and the installer APK, once) from the GitHub prerelease onto the phone.
2. Open the face APK with **real_time installer** (or tap CHOOSE FACE APK in the app), then tap **INSTALL TO WATCH**. Wait for ✓ INSTALLED.
3. On the watch, long-press the face and add it (updates apply straight away). Customize it in Galaxy Wearable or on the watch; set the bottom slot to Timer.
4. Tell me how it looks and feels.

The PC never connects to the watch; everything goes through the phone.
