# real_time / HALO and REDLINE

A moving sci-fi HUD watch face for the Samsung Galaxy Watch7 40 mm on Wear OS 6. HALO uses Watch Face Format 4: its APK contains XML and artwork, with no executable code or permissions.

The cyan-and-amber design has stacked dot-matrix hours/minutes, today's steps, battery, day/date and an editable timer shortcut. Seven effects can be switched independently: seconds marker, each rotating ring, bracket breathing, node drift/blink, core scan and wrist tilt. All start enabled. REFERENCE, PHOSPHOR and ICE palettes are available.

The user has confirmed HALO installs, displays and feels good in use. Timer provider behaviour, every individual setting, traces and matched battery measurements remain acceptance items. AOD is unnecessary for this project; a dim static time display is retained only as an ambient fallback.

[REDLINE](faces/redline/README.md) is the next independent face: a black/red concentric HUD with horizontal angular time, three instruments, subtle red glow and much faster counter-rotation with changing speed. Seven optional effects remain independently measurable. It uses the same generator, preview, release and phone measurement tools. The new design's watch behaviour still needs device verification.

## Local development

Requirements: Node 24+, JDK 17, Android SDK platform/build-tools 36. The wrapper pins Gradle 8.13 and the project pins AGP 8.12.0.

```bash
npm ci --ignore-scripts
npm run compose
npm run check
./gradlew :faces:halo:assembleDebug
```

Open `out/previews/index.html` directly in a browser. It includes all palettes, low battery, ambient, motion extremes and a motion loop. No preview server is needed. `out/previews/reference-comparison.json` is generated when the local reference image is available. Pass another path with `npm run previews -- --reference /path/to/reference.jpg`.

REDLINE's gallery is `out/previews/redline/index.html`. `npm run compose` builds both resource trees, and `npm run check` reproduces both byte for byte. Use `bash scripts/release-wear.sh --face redline --verify-only` for its signed local build. HALO retains its `v0.1.0` tag; new faces have independent tags such as `redline-v0.1.0`.

## Signed local builds

```bash
node scripts/setup-signing.mjs
bash scripts/setup-validators.sh
bash scripts/setup-perfetto.sh
bash scripts/release-wear.sh --verify-only
```

Back up `keys/real_time-release.jks` and `keystore.properties` together to a private location. The same signing key is required for later updates. Both are excluded from git. `signing-certificate.sha256` is the public certificate digest used by release verification.

The release check runs TypeScript checks, tests, exact resource reproduction, preview checks, Google's WFF validator, Android lint, signature/package/code/permission checks and Google's interactive/ambient memory evaluator. It creates `dist/real_time-halo-v0.1.0.apk`, checksums, the capture script, a run metadata template and the source commit ID. Reports are under `out/verification`.

GitHub creation, pushing and prerelease publication require the user's approval. The repository and releases are not created by verify-only mode. After an approved push, the publication command is:

```bash
bash scripts/release-wear.sh --prerelease --publish
```

## Install from the phone

Use the [real_time phone helper](diagnostics/phone/README.md) for both installation and the run-test/copy/paste diagnostics flow. Install the helper APK on the phone using Android's normal package installer; download the HALO watch-face APK onto the same phone. Wear Installer 2 and Bugjaeger are optional alternatives.

1. On the watch, enable Developer options by opening About watch → Software information and repeatedly tapping Software version until the watch confirms developer mode.
2. In Developer options, enable Wireless debugging and ADB debugging if separately shown. Put phone and watch on the same Wi-Fi network.
3. In the helper's WATCH CONNECTION section, enter the watch's IP. On the watch choose Pair new device; enter its pairing port and six-digit code in the helper and tap PAIR WITH WATCH.
4. Enter the **connection port** on the watch's main Wireless debugging screen and tap CHECK CONNECTION. This port can differ from the pairing port and can change later. The helper uses its own pairing identity; pairing from another installer is not shared.
5. Download the HALO APK and `SHA256SUMS` from the approved watch-face prerelease. In the helper tap CHOOSE FACE APK, select the HALO watch-face APK, review its version and tap INSTALL TO WATCH. The phone helper APK itself cannot be selected as a face.
6. On the watch, long-press the current face → add a face → choose HALO. Edit it to select colours and effects.
7. Edit TIMER SHORTCUT and select Timer if the watch offers it. An empty slot says SET TIMER. A configured slot shows the provider's text or icon, so another selected app is never falsely labelled TIMER. Tap it and verify the correct app opens.
8. Turn wireless debugging off. Leave AOD off for normal use and the battery baseline.

If Timer is unavailable, export the probe described in [the diagnostics guide](tools/measure/README.md). We will inspect the installed Samsung package and exported activities before adopting a direct launch target. HALO does not substitute Alarm.

## Device acceptance

- Check all digits, 12/24-hour setting, midnight/day rollover, steps and battery against the watch.
- Check the seconds marker and slow ring motion, then toggle every effect off/on separately. Disabled rings/brackets/nodes stay in their reference pose; seconds and scan overlays disappear.
- Check each palette and the ±3-unit tilt effect. Confirm text is readable on the actual watch.
- Configure and test Timer. Capture a screenshot using the watch's screenshot gesture and provide it for comparison.
- Use the [phone helper](diagnostics/phone/README.md) to run tests and copy a report into the chat, or follow the [manual export workflow](tools/measure/README.md).

No emulator or PC-to-watch ADB connection is part of this workflow.
