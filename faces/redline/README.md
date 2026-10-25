# REDLINE

A standalone WFF 4/API 36 HUD for Galaxy Watch7 40 mm, package `com.thedungeons2077.realtime.redline` (`.dev` for debug). The user confirms 0.2.1 customization works and the face looks good. Version 0.3.0 applies their next layout and smoothness requests; its changes still require device acceptance.

## Focused layout

The DUNGEONS label, all three instrument circles, steps, battery icon/arc, instrument rotors and Timer complication are removed. The centre now contains only:

- The uppercase full date above time at **42 units**, exactly **3.5×** the former 12-unit size, with a 56-unit-high text box.
- A flatter angular **hh:mm** clock following the watch’s 12/24-hour setting. Source digits are 62×76 and colon 20×76; the complete time is 268 units wide in a 272×76 box. Every box corner fits the 145-unit inner circle.
- A centred battery percentage below time. At ≤15% it changes to the existing amber warning colour. No icon or circular battery arc remains.

Readouts stay fixed while the surrounding tracks rotate/tilt. Six palettes remain: Reference Red, Amber, Cyan, Green, Violet and Ice. Literal paint/cached coloured layers preserve the confirmed 0.1.1 white-screen workaround.

## Motion and smoothness

New instances default to **Slow (0.5×) + Smooth**. Existing saved settings are preserved; choose these values explicitly after updating. Still, Standard and Fast remain available. Seconds retain their one-minute circuit at every moving speed. The instrument-rotor control is removed; the six retained effects are seconds beacon, outer rotor, inner counter-rotor, accent breathing, radar sweep and bounded wrist depth.

Smooth now requests **60 fps** linear interpolation from one integer-clock target to the next. The target predicts the next second, so after settling its intended trajectory follows wall-clock phase. Counter-rotation wraps explicitly in the correct direction. Every transition is one second with `repeat=0`; fresh clock targets restart interpolation after activation instead of relying on the infinite constant-target loops that failed in 0.2.0. The first second after activation may settle to phase. [Android documents Transform transitions](https://developer.android.com/training/wearables/wff/transform) and the [Animation fps/direction attributes](https://developer.android.com/reference/wear-os/wff/common/transform/animation).

A requested rate does **not** prove the rate a particular firmware delivers. At 0.5×, steady outer/inner rotation is 10°/s and 15°/s. At a delivered 60 fps, calculated track displacement would be below one pixel per frame. Actual cadence, visible smoothness, re-entry and power require Watch7 testing. Dynamic keeps direct clock-expression motion as a fallback. No speed/style changes timekeeping.

Disabled effects select static reference poses; seconds/radar overlays disappear. Still removes every decorative clock/sensor dependency and transition. Ambient remains static dim time only on black; normal use and battery baselines assume AOD off.

## Working customization architecture

The user reports all customization works in 0.2.1 after missing icons and unsupported nested scene selectors were repaired. Preserve that architecture: flat catalogue declarations, explicit captioned 96×96 option icons and accessible labels, and configuration-driven Conditions. No nested native scene selectors or theme-index colour references are used. The 0.3.0 editor has nine categories/24 options, covering 3,072 combinations.

Galaxy Wearable → Watch faces → REDLINE → Customize → choose the desired palette/speed/style/effect → **Save**. On the watch, long-press REDLINE → Customize/Edit. Reopen editors to confirm choices persist and agree. Close/reopen an editor left open during the update so it loads the new schema. Do not clear application data or pairing as a routine workaround.

## Hardware/resource calibration

The 432-unit canvas matches the Watch7 40 mm’s native display. Foreground checks include glow/strokes and simultaneous ±2-unit tilt, retaining a six-unit circular margin. Source geometry and numeric motion remain shared with SVG. Cached cropped lossless layers preserve painter order and avoid runtime blur or bitmap animation sequences. The user’s source reference is used only in ignored local comparison output, never packaged.

The revised full-motion source scene has 206 parts, cached to 14; complete selected WFF has at most 15 parts. Six layers serve each palette, with 31 unique resources because identical neutral artwork is shared across palettes. The official evaluator records **22,230,640 active bytes** (about 21.2 MiB) and **97,280 ambient bytes**, below 100 MiB/10 MiB limits. These are structural/resource metrics, not measured CPU/FPS/battery improvements. SVG preview ambient coverage is about 3.47%.

Run `npm run check`, `bash scripts/release-wear.sh --face redline --verify-only` and `bash scripts/release-diagnostics.sh --verify-only`. Checks cover packaged AAPT2-renamed resources, icon visibility, deterministic generation, vector/cache visual equivalence, motion bounds, all editor selections, warning thresholds, date rollover, 12/24-hour time and predictive interpolation across wrap/midnight/re-entry time gaps. HALO’s resources remain unchanged.

## Delivery and acceptance

Local outputs are `dist/real_time-redline-v0.3.0.apk` and optional phone helper `dist/diagnostics/real_time-diagnostics-v0.5.0.apk`. Existing helpers can install the face. The new helper supplies its exact source commit and the six-effect measurement catalogue; HALO keeps seven effects. Use earlier helpers for complete experiments on legacy REDLINE instrument builds; missing historical declarations are labelled unavailable.

After installation, verify the new layout, date size, inner-circle time fit, battery/threshold, all palettes and six effects. At **Slow + Smooth**, check motion after the first second, then switch to HALO and back, test Still/restore, editor save/cancel, and timeout/wake. Compare with Dynamic at the same speed. If there is a freeze/failure, capture the on-demand renderer report and record the settings. No delivered FPS or energy result is accepted without device evidence.

Repeat three performance captures per chosen configuration at matched brightness, timeout, connectivity and wrist position. See `OPTIMIZATION.md` and [FACE_STANDARD.md](../../FACE_STANDARD.md) for the shared workflow and future-face design principles. Publication of `redline-v0.3.0` and `diagnostics-v0.5.0` requires approval after local review.
