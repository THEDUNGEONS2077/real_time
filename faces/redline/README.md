# REDLINE

An independent black-and-red HUD face for the Galaxy Watch7 40 mm on Wear OS 6. Package: `com.thedungeons2077.realtime.redline` (`.dev` for debug). HALO remains independent.

The local reference is `Dungeons Cyberpunk HUD Watch Face.png`, supplied by the user. The face preserves its concentric mechanical bands, red accents, DUNGEONS name, horizontal white time, upper marker, corner reticle and three circular instruments. Artwork is reauthored as vectors and original small masks. The reference image is used only for the ignored local comparison preview and is not packaged or committed.

## Layout and motion

The clock has original angular segmented bitmap glyphs, with spacing between adjacent digits, and follows the watch's 12/24-hour setting. Its date includes uppercase weekday, day and month. The right dial displays actual steps; the lower dial displays actual battery level and a remaining-charge arc. At ≤15%, that arc becomes amber so the warning stands apart from the red decoration. The left dial is a customizable Timer shortcut: SET TIMER while empty, then actual provider content. Timer availability and launch behaviour require device acceptance.

| Editor switch | Enabled behaviour | Disabled behaviour |
|---|---|---|
| Seconds beacon | One circuit per minute on its own thin track | Overlay removed |
| Outer rotor | Clockwise, 18-second base period; ±7° modulation over six seconds | Reference pose |
| Inner counter-rotor | Counterclockwise, 12-second base period; ±5° modulation over four seconds | Reference pose |
| Subtle red pulse | Narrow accent halos vary softly over 2.4 seconds | Reference brightness |
| Instrument rotors | Local dial verniers rotate in 8, 10 and 24 seconds, in opposing directions | Reference poses |
| Radar sweep | A faint red sweep circles behind the readouts in 12 seconds | Overlay removed |
| Wrist depth | Main carriers move at most ±2 units on both axes | Centred |

All switches start enabled. Main rotor base speeds are 20°/s and 30°/s, versus HALO's 3°/s and 1.2°/s. Modulation preserves direction and remains continuous at phase resets. Time, date, steps, battery and the Timer touch target do not rotate or tilt. REFERENCE RED is the deliberately single colour palette. Ambient fallback is static, dim time on black; normal use assumes AOD off.

## Hardware and efficiency calibration

[Samsung's specifications](https://www.samsungmobilepress.com/articles/samsungs-expanded-wearables-portfolio-unlocks-intelligent-health-experiences-for-all) list a 432×432 AMOLED panel for the 40 mm Watch7, an Exynos W1000 (five cores, 3 nm), 2 GB RAM and a 300 mAh battery. The design uses that native coordinate space and keeps stroked/glowing foreground geometry at least six units inside the circular edge, including maximum tilt and local rotor pivots.

Glow uses three low-opacity strokes around narrow red arcs, four tiny pre-rendered glow masks and small pre-rendered glyph masks. A static mesh mask carries the fine grid and facets. The watch performs no runtime Gaussian blur, full-screen bloom, image-sequence playback or face-owned code execution. WFF's system renderer owns frame scheduling; this build does not invent a hardware-specific FPS guarantee.

The official memory evaluator reports 3,204,224 bytes maximum active memory (about 3.06 MiB) and 38,016 bytes ambient (about 37.1 KiB) for the initial build, below its 100 MiB/10 MiB limits. These are resource checks, not CPU or battery measurements. The user's positive HALO performance observation is encouraging but does not establish REDLINE's cost. Use the shared three-capture-per-preset and matched 24-hour battery workflow before claiming optimization results.

## Review, build and install

```bash
npm run compose
npm run check
bash scripts/release-wear.sh --face redline --verify-only
bash scripts/release-diagnostics.sh --verify-only
```

Open `out/previews/redline/index.html` locally for the aligned reference, 12-second motion sample, still mode, motion extremes, low battery, date rollover, large step values, Timer example and minimal ambient clock. SVG previews approximate the watch renderer. The animation's 12 preview fps is unrelated to on-watch frame delivery.

Local signed outputs are `dist/real_time-redline-v0.1.0.apk` and `dist/diagnostics/real_time-diagnostics-v0.3.0.apk`. Update the helper over its existing phone installation to retain pairing. Choose the REDLINE APK and INSTALL TO WATCH, then add/select REDLINE on the watch. The helper supports both HALO and REDLINE; its test setup uses the selected face's own package and palette. No extra permission or watch logger is added.

Before acceptance, check readability, 12/24-hour transitions, date, actual steps/battery, every individual toggle, speed modulation, glow, tilt and Timer on the watch. Repeat performance captures with the same brightness/timeout/connectivity and AOD off. Publication uses a separate `redline-v0.1.0` prerelease and requires user approval. The helper is released separately as `diagnostics-v0.3.0`.
