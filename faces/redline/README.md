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

**ROTATION STYLE** offers SMOOTH (steady clock-driven rotation, default) and DYNAMIC (modulated main-ring speed). Both derive moving poses from live platform time. Version 0.2.0's native repeat animations were reported to stop after switching faces; 0.2.1 removes those loops and their 30 fps request. Delivered smoothness is still a watch measurement, not a preview/XML guarantee. No speed control changes timekeeping or spins the readouts. Ambient is static dim time on black for every setting; normal use assumes AOD off.

The native time font is now 108 units, exactly twice the original 54. Each digit renders at 68×108, with a 296-unit complete time width in a 300×114 box. Battery moves to the top centre, Timer to the lower left and steps to the lower right. The larger time does not overlap the live instruments or complication touch area.

## Phone and watch customization repair

The user reports blank options and ineffective selection on both Galaxy Wearable and the watch in 0.2.0. That build supplied no option artwork and nested native scene configuration selectors. [Android's personalization guide](https://developer.android.com/training/wearables/wff/personalization/user-configurations) disallows nested selector use even through groups; the XSD validator did not catch this.

Version 0.2.1 supplies visible captioned 96×96 PNGs, labels and accessibility text for all 26 options. Every declaration remains flat; scene selections use value-based Conditions with fallback branches. Effects use explicit ON/OFF list tiles with stable TRUE/FALSE values, so both editors have real artwork instead of implicit Boolean placeholders. Existing Boolean effect selections can return to their ON default once during this schema change; check the seven settings after upgrading.

The shared catalogue is `tools/compose/faces/redline/editor.ts`, built through `tools/compose/src/editor.ts`. `verify_editor.py` checks all 6,144 combinations and real packaged resources, including AAPT2-renamed paths and pixel-equivalent reencoded PNGs. These are local wiring checks, not actual Galaxy Wearable acceptance.

## White-screen investigation

The user confirmed 0.1.0 installs but turns white in both preview and applied mode; switching to HALO restores normal rendering. WFF/schema, memory and SVG checks passed, which demonstrates their limits as runtime evidence. [Android's WFF debug guide](https://developer.android.com/training/wearables/wff/debug) documents white as a fallback when a theme-colour lookup fails. The single-option configuration is a face-specific suspect, not a confirmed cause from device logs.

Version 0.1.1 removed the lookup while preserving reference colours and motion. The user now confirms it displays correctly and looks good, with motion less smooth than desired. Versions 0.2.0 and 0.2.1 preserve literal-colour rendering in selected palette subtrees instead of restoring theme-colour references. The precise original cause remains a hypothesis without logs. If a new option fails, reproduce it, restore HALO if needed, then collect the helper's on-demand renderer diagnostics. Logs may include an earlier face; successful validation is not device acceptance.

## Hardware and efficiency calibration

[Samsung's specifications](https://www.samsungmobilepress.com/articles/samsungs-expanded-wearables-portfolio-unlocks-intelligent-health-experiences-for-all) list a 432×432 AMOLED panel for the 40 mm Watch7, an Exynos W1000 (five cores, 3 nm), 2 GB RAM and a 300 mAh battery. The design uses that native coordinate space and keeps stroked/glowing foreground geometry at least six units inside the circular edge, including maximum tilt and local rotor pivots.

The vector source authors glow as three low-opacity strokes around narrow arcs, plus tiny glow/glyph masks. Version 0.2.1 bakes sufficiently large static runs and rotor artwork into cropped lossless coloured layers. Seven deduplicated layers serve each palette, 42 across all colours; live group transforms and data remain separate. The same revised full-motion scene drops from 325 separate parts to 26, with at most 32 selected WFF parts including all Timer-provider branches. XML decreases about 90%. These are structural metrics, not measured CPU/FPS/battery results. Cached raster rotation slightly changes subpixel antialiasing; vector/cache comparison tests cover colours and motion/tilt states. A static mesh mask carries the fine grid and facets. The watch performs no runtime Gaussian blur, full-screen bloom, image-sequence playback or face-owned code execution. WFF's system renderer owns frame scheduling; this build does not invent a hardware-specific FPS guarantee.

The official memory evaluator reports 3,204,224 bytes maximum active memory (about 3.06 MiB) and 38,016 bytes ambient (about 37.1 KiB) for the initial build, below its 100 MiB/10 MiB limits. Version 0.2.0 evaluates to 3,280,256 active bytes (about 3.13 MiB), with the same 38,016 ambient bytes. Version 0.2.1 evaluates conservatively to 25,917,536 active bytes (about 24.7 MiB) and 38,016 ambient bytes. This records the memory tradeoff of caching and remains within the official budgets. These are resource checks, not CPU or battery measurements. The user's positive HALO performance observation is encouraging but does not establish REDLINE's cost. Use the shared three-capture-per-preset and matched 24-hour battery workflow before claiming optimization results.

## Review, build and install

```bash
npm run compose
npm run check
bash scripts/release-wear.sh --face redline --verify-only
bash scripts/release-diagnostics.sh --verify-only
```

Open `out/previews/redline/index.html` locally for the aligned reference, 12-second 30 fps motion sample, six palettes, all four speeds, both rotation styles, still mode, motion extremes, low battery, date rollover, large step values, Timer example and minimal ambient clock. SVG previews approximate the watch renderer. The animation's 30 preview fps is unrelated to on-watch frame delivery.

Local signed outputs are `dist/real_time-redline-v0.2.1.apk` and `dist/diagnostics/real_time-diagnostics-v0.4.1.apk`. Update the helper over its existing phone installation to retain pairing. Choose the REDLINE APK and INSTALL TO WATCH, then add/select REDLINE on the watch. The helper supports both HALO and REDLINE; its test setup uses the selected face's own package and palette. No extra permission or continuous watch logger is added.

To customize from the phone: Galaxy Wearable → Watch faces → REDLINE → Customize. Open COLOURS, MOTION SPEED, ROTATION STYLE or an individual effect, choose its captioned tile, then **Save**. Reopen Customize to verify the selected value persists, and check the applied watch face. To customize on the watch, long-press REDLINE → Customize/Edit. Changes must agree after reopening the other editor.

After installing 0.2.1, close and reopen an already-open editor so it loads the updated schema/artwork. If it still shows the old blank controls, leave the editor, select HALO and REDLINE again, then reopen Galaxy Wearable. Do not clear application data, remove pairing or reset the watch. If the new build still fails, collect renderer diagnostics and record whether preview, Save, persistence or re-entry fails, along with the exact choices.

Acceptance remains pending on the user's Galaxy Wearable/Watch7 setup. Check every tile and Save action, reopen to confirm persistence, cancel a different selection, change settings from the other editor, test Still/restored motion, and switch to another face and back repeatedly. Check timeout/wake and a restart. Confirm Timer selection/provider content and launch behaviour, real steps/battery/date, time readability and static ambient. [FACE_STANDARD.md](../../FACE_STANDARD.md) contains the complete shared acceptance protocol and future-face architecture/design contract.

For measurements, choose REDLINE in helper 0.4.1 and declare the matching palette/speed/style/effects. Existing helpers can install the APK; 0.4.1 adds its exact source provenance. Repeat three performance captures at matched conditions, changing one effect or speed/style at a time. The larger time is a requested display change, so its larger lit area must be considered in any energy comparison. No measured optimization win is claimed.

Publication uses `redline-v0.2.1` and optional `diagnostics-v0.4.1` prereleases, requiring approval after local review.
