# real_time

Moving sci-fi HUD watch faces for the Samsung Galaxy Watch7 40 mm (Wear OS 6). Each face is a Watch Face Format 4 APK with resources only: no code and no permissions. The system draws it.

| Face | Status | Docs |
|---|---|---|
| **REDLINE** 1.0 | Black/red concentric HUD. 8 clock fonts, glow and size, 6 palettes, 4 speeds, 6 effects, Timer complication | [faces/redline/README.md](faces/redline/README.md) |
| **HALO** 0.1.0 | Cyan/amber dot-matrix HUD (frozen) | [DESIGN.md](DESIGN.md) |

The [phone helper](diagnostics/phone/README.md) installs faces from the phone and runs the smoothness, trace and battery tests. New faces follow [FACE_STANDARD.md](FACE_STANDARD.md). See [ARCHITECTURE.md](ARCHITECTURE.md) for how the generator works and [OPTIMIZATION.md](OPTIMIZATION.md) for what has been measured.

## Develop

Requirements: Node 24+, JDK 17, Android SDK platform and build-tools 36.

```bash
npm ci --ignore-scripts
npm run compose          # regenerate both faces' resources from tools/compose
npm run check            # types, tests, byte-for-byte reproduction, preview galleries
```

Open `out/previews/redline/index.html` (or `out/previews/index.html` for HALO) directly in a browser; no server is needed.

## Signed builds

```bash
node scripts/setup-signing.mjs        # once; back up keys/real_time-release.jks + keystore.properties privately
bash scripts/setup-validators.sh      # Google's pinned WFF validator and memory evaluator
bash scripts/setup-phone-tools.sh     # helper build inputs
bash scripts/release-wear.sh --face redline --verify-only
bash scripts/release-diagnostics.sh --verify-only
```

Verify-only builds `dist/` artifacts and reports under `out/verification/` without touching GitHub. Pushing and publishing a prerelease (`--prerelease --publish`) happen only after the user approves.

## Install and test

1. Download the face APK (and the helper APK, once) from the GitHub prerelease onto the phone.
2. In the helper: **1 · CONNECT** → **2 · INSTALL A FACE**. Then on the watch, long-press the face and add it.
3. Customize it in Galaxy Wearable or on the watch. Set the bottom slot to Timer.
4. In the helper, **3 · TEST SMOOTHNESS**, then **4 · REPORT** → COPY REPORT → paste into the chat.

The PC never connects to the watch; everything goes through the phone.
