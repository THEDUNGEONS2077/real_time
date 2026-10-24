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
| Subtle accent pulse | Narrow accent halos vary softly over 2.4 seconds | Reference brightness |
| Instrument rotors | Local dial verniers rotate in 8, 10 and 24 seconds, in opposing directions | Reference poses |
| Radar sweep | A faint red sweep circles behind the readouts in 12 seconds | Overlay removed |
| Wrist depth | Main carriers move at most ±2 units on both axes | Centred |

All switches start enabled. The table describes the original Dynamic profile at Standard speed. Main rotor base speeds are 20°/s and 30°/s, versus HALO's 3°/s and 1.2°/s. Modulation preserves direction and remains continuous at phase resets. Time, date, steps, battery and the Timer touch target do not rotate or tilt. Six palettes are available in the watch editor: **REFERENCE RED, AMBER, CYAN, GREEN, VIOLET and ICE**. Accents and their subtle glow change together; readouts remain white, backgrounds remain black/graphite and low battery remains fixed warning amber.

**MOTION SPEED** offers STILL, SLOW (0.5×), STANDARD (1×, default), and FAST (2×). It scales decorative rotation, modulation, pulse and radar periods. Seconds always complete a minute at nonzero speeds, and tilt stays bounded to ±2 units. STILL removes all optional motion, seconds/radar overlays and tilt regardless of the individual switches; time, date, steps, battery and the Timer provider remain live. Selecting another speed restores the individual switch choices.

**ROTATION STYLE** offers SMOOTH (default) and DYNAMIC. Smooth uses linear native looping transforms requesting 30 fps for main rings, instrument verniers and radar; Dynamic retains the original varying-speed main rings and clock-driven transforms. WFF supports explicit animation fps ([official reference](https://developer.android.com/reference/wear-os/wff/common/transform/animation)), but requested cadence does not guarantee delivered frames on the watch. Native decorative phases can restart when entering the editor or activating the face; SVG samples use a synthetic wall-clock phase for comparison. No speed control changes timekeeping or spins the readouts. Ambient fallback remains static dim time on black for every setting; normal use assumes AOD off.

## White-screen investigation

The user confirmed 0.1.0 installs but turns white in both preview and applied mode; switching to HALO restores normal rendering. WFF/schema, memory and SVG checks passed, which demonstrates their limits as runtime evidence. [Android's WFF debug guide](https://developer.android.com/training/wearables/wff/debug) documents white as a fallback when a theme-colour lookup fails. The single-option configuration is a face-specific suspect, not a confirmed cause from device logs.

Version 0.1.1 removed the lookup while preserving reference colours and motion. The user now confirms it displays correctly and looks good, with motion less smooth than desired. Version 0.2.0 preserves literal-colour rendering in native list-selected palette subtrees instead of restoring theme-colour references. The precise original cause remains a hypothesis without logs. If a new option fails, reproduce it, restore HALO if needed, then collect the helper's on-demand renderer diagnostics. Logs may include an earlier face; successful validation is not device acceptance.

## Hardware and efficiency calibration

[Samsung's specifications](https://www.samsungmobilepress.com/articles/samsungs-expanded-wearables-portfolio-unlocks-intelligent-health-experiences-for-all) list a 432×432 AMOLED panel for the 40 mm Watch7, an Exynos W1000 (five cores, 3 nm), 2 GB RAM and a 300 mAh battery. The design uses that native coordinate space and keeps stroked/glowing foreground geometry at least six units inside the circular edge, including maximum tilt and local rotor pivots.

Glow uses three low-opacity strokes around narrow red arcs, four tiny pre-rendered glow masks and small pre-rendered glyph masks. A static mesh mask carries the fine grid and facets. The watch performs no runtime Gaussian blur, full-screen bloom, image-sequence playback or face-owned code execution. WFF's system renderer owns frame scheduling; this build does not invent a hardware-specific FPS guarantee.

The official memory evaluator reports 3,204,224 bytes maximum active memory (about 3.06 MiB) and 38,016 bytes ambient (about 37.1 KiB) for the initial build, below its 100 MiB/10 MiB limits. Version 0.2.0 evaluates to 3,280,256 active bytes (about 3.13 MiB), with the same 38,016 ambient bytes. These are resource checks, not CPU or battery measurements. The user's positive HALO performance observation is encouraging but does not establish REDLINE's cost. Use the shared three-capture-per-preset and matched 24-hour battery workflow before claiming optimization results.

## Review, build and install

```bash
npm run compose
npm run check
bash scripts/release-wear.sh --face redline --verify-only
bash scripts/release-diagnostics.sh --verify-only
```

Open `out/previews/redline/index.html` locally for the aligned reference, 12-second 30 fps motion sample, six palettes, all four speeds, both rotation styles, still mode, motion extremes, low battery, date rollover, large step values, Timer example and minimal ambient clock. SVG previews approximate the watch renderer. The animation's 30 preview fps is unrelated to on-watch frame delivery.

Local signed outputs are `dist/real_time-redline-v0.2.0.apk` and `dist/diagnostics/real_time-diagnostics-v0.4.0.apk`. Update the helper over its existing phone installation to retain pairing. Choose the REDLINE APK and INSTALL TO WATCH, then add/select REDLINE on the watch. The helper supports both HALO and REDLINE; its test setup uses the selected face's own package and palette. No extra permission or continuous watch logger is added.

To customize: long-press REDLINE → Customize/Edit → COLOURS, MOTION SPEED or ROTATION STYLE. Start with SMOOTH + STANDARD, then compare SLOW for smaller angular steps. Try FAST for stronger movement; no tested battery cost is implied. Every individual effect switch remains available.

Before accepting 0.2.0, check each colour, each speed, both styles, individual switches, readable fixed readouts, live data, tilt and Timer on the watch. Check STILL stays still, seconds remain accurate at other speeds, and ambient is time-only. Compare smoothness with 0.1.1; if a mode fails, report its exact settings and copy renderer diagnostics. For measurement, select REDLINE in helper 0.4.0 and match the editor's palette/speed/style and effect switches. Older REDLINE builds use UNAVAILABLE / OLDER VERSION for the new declarations. Repeat three performance captures with matched brightness/timeout/connectivity and AOD off, changing one control at a time.

Publication uses a separate `redline-v0.2.0` prerelease and requires approval. The optional helper update is released separately as `diagnostics-v0.4.0`; the existing helper can install the new face without updating.
