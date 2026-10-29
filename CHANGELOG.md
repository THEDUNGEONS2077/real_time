# Changelog

## NEXUS 0.1.2 (build 3)

- Candidate for Galaxy Wearable timing out when opening Customize; the user reports that on-watch editing works reliably. Excessive scene duplication is a suspected contributor, not an established cause.
- Share interactive clocks and readouts across palettes using WFF 4 typed RGB transforms driven only by the existing palette setting. Keep all controls/icons/defaults, clock geometry, glyphs, motion and static ambient unchanged. No indexed theme-colour lookup is used.
- Reduce XML by 44.0%, total elements by 49.8% and clock declarations from 480 to 102. Compare 3,776 interactive and 48 ambient states against drawing-instruction hashes from released 0.1.1.
- Existing installer 0.7.2 installs the update; no re-pairing, reset or installer update is needed. Phone editor opening, colour rendering, Save/persistence and motion still require device acceptance for this candidate.

## NEXUS 0.1.1 (build 2)

- Optimize the accepted design with every effect still enabled by default. Layout, colours, fonts, settings IDs, real seconds and decorative motion rates are unchanged.
- Crop transparent borders, composite the four static console layers at build time and apply image opacity directly instead of through full-canvas groups. Preserve external pivots for the sweep and seconds marker; remove redundant containers and the duplicate black ground draw.
- Default decoration: 12 images → 9; total declared image rectangle area 1,866,408 → 629,601 pixels (66.3% smaller); full-canvas opacity groups 3 → 0. Selected drawing parts fall from 20–24 to 16–20.
- All 384 matching raster comparisons stay within 2/255 channel difference. The gallery now uses the actual packed assets and per-instance tint, matching watch rendering more closely.
- This reduces structural rendering work; smoother delivery and battery benefit remain unconfirmed until compared on the watch. Installer 0.7.2 already supports this update; pairing and customization selections are preserved.

## NEXUS 0.1.0 (build 1)

- New two-tone command deck combining HALO's instruments, REDLINE's mechanical HUD, CIPHER's terminal orbit and Cyberdeck's circuitry/bevelled surfaces.
- Large fixed centred clock, date above, battery below and an editable Timer/shortcut tile. Minimal time-only ambient fallback.
- Eight dual-colour palettes, six fonts, three sizes, three clock-glow levels, four speeds and six independent effects with real captioned option tiles.
- Live-clock motion without animation loops or tilt: a mechanical ring, counter-rotating code, bezel sweep, two tiny circuit signals, breathing facet light and real seconds. Default Slow; all effects enabled. Static branches remove disabled motion dependencies.
- Eleven shared baked artwork masks and shared pinned glyphs; no executable code or permissions in the face. Existing face resources remain unchanged. See `faces/nexus/VERIFICATION.md` for local results; device acceptance is pending.

## Installer 0.7.2 (build 14)

- Accept NEXUS APKs while retaining the existing signature, resource-only, permission and explicit-install checks.
- Add a regression test using NEXUS's actual AAPT2-packaged APK. Existing pairing and install-only workflow are preserved.

## CIPHER 0.1.0 (build 1)

- **New face:** a green phosphor terminal HUD inspired by cyberdeck_terminal's matrix rain.
  - Two rings of matrix glyphs (about a third mirrored) turn in opposite directions to a segmented arc ring between them.
  - A comet sweeps the outer track, and eight rain columns fall behind.
- **Built light:** every moving piece is one baked mask moved by the live clock. Motion starts instantly on wake, there is no tilt sensor, and a selected tree is 19–29 parts. Memory is 12.5 MB active (REDLINE: 30.0 MB) and the APK is 480 KB.
- **Settings:**
  - six cyberdeck_terminal palettes (PHOSPHOR default);
  - VT323, Share Tech Mono, DOT and SEGMENT clock fonts;
  - clock size and glow (HIGH default);
  - four speeds;
  - five switchable effects.
- **Timer slot:** the same bottom complication as REDLINE.

## Installer 0.7.1 (build 13)

- Accepts CIPHER APKs.

## REDLINE 1.1.0 (build 9)

- **No pause on wake.** SMOOTH now drives the rings from the live clock every frame, so they move the instant the face appears after unlocking or swiping. Before, they waited up to a second for the next clock tick. Your saved SMOOTH setting switches automatically.
- **GLIDE.** The 1.0 interpolated style is kept as a new ROTATION STYLE option, for comparison.
- **Faster inner red bands.** The two counter-clockwise red bands now turn separately and faster, at different speeds. At Slow the inner band turns once per 72 s and the inset band once per 48 s; both shared one 120 s revolution before. INNER COUNTER-ROTOR still switches both.

## Installer 0.7.0 (build 12)

- **Install only.** The phone helper is now just an installer: connect, choose a face APK, INSTALL TO WATCH. A real 0–100% progress bar shows while the file is sent, and a large ✓ INSTALLED or ✗ NOT INSTALLED result appears at the end, with COPY ERROR DETAILS on failure.
- **Open APKs directly.** A downloaded face APK can be opened straight into the installer with "Open with" from Files or the browser. Installing still needs a tap.
- **Diagnostics removed.** Smoothness, trace, battery and renderer tests are gone, along with the bundled Perfetto processor and collector. The app also deletes its old test captures. Pairing is kept.

## REDLINE 1.0.0 (build 8)

- **Clock fonts:** 8 to choose from. REDLINE angular (default), SEGMENT LCD with faint unlit segments, Rajdhani, Oxanium, Chakra Petch, Share Tech Mono, VT323 terminal and DOT matrix. Each is baked into glyph masks, so there is no runtime font. The date and battery follow the chosen font.
- **CLOCK GLOW:** OFF / LOW / HIGH, baked into the glyphs.
- **CLOCK SIZE:** SMALL / MEDIUM / LARGE. Medium is 0.3.2's size, and every font stays centred.
- **Timer slot:** a new tappable complication at the bottom. It shows a provider's text, icon or progress bar, and SET TIMER until you choose Timer in Customize.
- **Layout:** battery moves above the date to make room for the slot.
- **Motion and defaults:** unchanged from 0.3.2 (Slow + Smooth, the same rings and effects). New settings default to the 0.3.2 look, and saved choices are kept.
- **Rebuilt generator:** readable, commented modules (core, WFF, SVG, editor, fonts). HALO's generator is frozen and byte-identical.
- **Release checker:** now covers 1,022 editor states plus every glyph's size and the slot, instead of a full product that no longer scales.
- **Memory:** the official evaluator gives 30.0 MB active and 1.3 MB ambient (limits 100 / 10). Delivered smoothness is to be measured with the helper.

## Diagnostics 0.6.0 (build 11)

- **New layout:** a four-step screen (CONNECT, INSTALL, TEST, REPORT) with a status line, progress bar and CANCEL. First-time pairing folds away once it has worked.
- **SMOOTHNESS TEST (20 s):** one tap. It finds the watch-face surface itself and reports delivered fps, frame times, missed frames and renderer CPU from SurfaceFlinger's frame history.
- **Moved under MORE TESTS:** the 30 s trace, battery test, renderer logs and trace reanalysis.
- **Test labels:** settings now include REDLINE 1.0's font, size and glow, and the provenance list includes REDLINE 1.0.0.

## REDLINE 0.3.2 (build 7)

- Centre visible time on both axes at (216,216), fixing the right-biased fixed-width cell around 1. Use tightly cropped proportional advances, no inserted spaces/tracking, and minimal antialiasing clearance so digits and colon remain distinct.
- Increase font size from 94 to 117.5 (25%), with whole-pixel masks approximating the same horizontal enlargement. Move the centred corner marks, date and battery clear of the new clock; retain the half-size date and live 12/24-hour preference.
- Retain a compact centred 94-unit dim ambient fallback. Add dense/midnight ambient checks; dense 08:08 uses about 7.30% of the round display in the SVG check, within its 10% guard.
- Thicken both inner red bands from 3.2 to 5.5 units without widening their subtle glow. Rotate them together counterclockwise once per 120 seconds at 0.5×; preserve independent breathing/rotation controls, smooth clock-refreshed interpolation, outer speed and real-time seconds.
- Verify visible-ink centring across narrow/wide/mixed digits, all 3,072 configurations and packaged resources. New layout/ring behaviour requires watch acceptance; no delivered FPS or battery change is claimed.
- Official memory is 22,379,376 active / 159,064 ambient bytes. Omit the pinned validator's optional optimization hints because their integer-only font parser rejects valid fractional sizes; retain official budget checks/reporting and explicitly reject missing PASS, FAIL or exceptions.

## Diagnostics 0.5.2 (build 10)

- Add exact REDLINE 0.3.2 source provenance. Existing helpers can install it; this optional update keeps measurement reports accurate.

## REDLINE 0.3.1 (build 6)

- Expand time to 65×94 digit cells and a 280×94 clock box. Full-width glyph ink reaches within about two pixels of the existing corner-bracket frame; the original angular glyph design is retained.
- Reduce the date from size 42 to 21 (50%) and centre its 28-unit box above time, preserving its previous vertical centre.
- Official memory evaluation passes at 22,288,000 active bytes and 125,960 ambient bytes.
- Preserve the clock-refreshed motion, effect choices, palette, battery layout and renderer part count. The user reports 0.3.0 looks very smooth; delivered FPS and battery results remain unmeasured.

## Diagnostics 0.5.1 (build 9)

- Add exact REDLINE 0.3.1 source provenance. Existing helpers can install the face; this optional update keeps experiment reports accurate.

## REDLINE 0.3.0 (build 5)

- Remove the DUNGEONS label, all three instrument dials, steps, battery icon/arc, instrument rotors and Timer complication. Retain only the live date, time and a centred battery percentage.
- Fit flatter 62×76 glyphs (268 units across) to the inner circular opening. Put the full uppercase date above time at size 42, exactly 3.5× its former size, with an unclipped 56-unit text box. Battery percentage sits below time and retains the ≤15% warning colour.
- Default new instances to Slow (0.5×) + Smooth. Smooth requests 60 fps linear, non-repeating transitions between next-second clock targets; directional wrapping prevents rotor reversals. Targets refresh each second rather than relying on a free-running loop. Dynamic remains the direct-clock fallback. Actual cadence, re-entry behaviour and battery cost require Watch7 testing.
- Share identical neutral cached artwork across palettes rather than packaging six copies.
- Remove the obsolete instrument control while retaining the working catalogue/Condition architecture. Verify all 3,072 combinations and 24 option icons. The cached scene has 14 parts instead of 26; official evaluation passes at 22,230,640 active bytes and 97,280 ambient bytes. These are structural/resource results, not measured FPS.
- The user confirms 0.2.1 customization works and the face looks good; smoother motion remains their requested improvement.

## Diagnostics 0.5.0 (build 8)

- Use the six-effect REDLINE catalogue and face-specific effect presets while retaining HALO’s seven controls. Default the REDLINE speed declaration to Slow.
- Add REDLINE 0.3.0 source provenance. Legacy reports retain their old control names; a missing legacy instrument declaration is shown as unavailable. Pairing, explicit installation, diagnostics and permissions are preserved.

## REDLINE 0.2.1 (build 4)

- Repair candidate for blank/ineffective customization: supply captioned icons and accessible labels for all 26 options; replace nested native scene selectors with configuration-driven Conditions. Use explicit ON/OFF list tiles for effects. Both platform editors still need device acceptance.
- Replace native repeating animation loops after the user reports motion stops on face re-entry. Smooth now uses steady live-clock rotation; Dynamic retains modulation. No fixed FPS claim is made.
- Double time glyphs to 68×108 units with a 300×114 native clock box. Move battery above time and Timer/steps below it; retain a larger static dim ambient clock.
- Cache static/rotating artwork into cropped lossless layers: the same revised full-motion scene falls from 325 separate parts to 26; selected WFF has at most 32 parts including all provider branches. XML decreases about 90%. These are structural metrics, not measured speed or battery results.
- Pass official memory evaluation at 25,917,536 active bytes and 38,016 ambient bytes; caching increases image-memory estimates while reducing drawing parts.
- Add 6,144-combination selected-tree validation, real packaged icon/label/image checks, visible-icon tests and vector/cache visual comparisons. Define FACE_STANDARD.md as the architecture, design, editor and optimization contract for every new face.

## Diagnostics 0.4.1 (build 7)

- Add explicit REDLINE 0.2.1 source provenance. Existing installation and test workflows are preserved; no permission, background component or automatic transfer is added.

## REDLINE 0.2.0 (build 3)

- Added six editor palettes: Reference Red, Amber, Cyan, Green, Violet and Ice. Selected branches embed literal colours, preserving the 0.1.1 workaround; no runtime colour lookup is introduced.
- Added Still, Slow (0.5×), Standard (1×) and Fast (2×) speed controls. Still removes every optional motion/sensor source; other speeds leave the seconds beacon accurate and live readouts fixed. Individual effect switches remain available.
- Added Smooth rotation as the default: linear, native looping interpolation requesting 30 fps for decorative rotors. Dynamic retains the original modulated main rings and clock-driven motion. Actual frame delivery and cost require Watch7 testing.
- Passed official WFF 4 and memory checks at 3,280,256 active bytes and 38,016 ambient bytes. Added palette/speed/style previews, motion checks and matching measurement metadata. The user confirmed 0.1.1 renders correctly and looks good, while requesting smoother motion; no controlled performance or battery result is available.

## Diagnostics 0.4.0 (build 6)

- Added REDLINE palette, motion-speed and rotation-style declarations to test setup and copied reports, with separate known 0.2.0 source provenance. These describe the watch editor settings and do not change them remotely.
- Preserved pairing, explicit APK installation, signature/resource checks, on-demand diagnostics and local-only storage/networking.

## REDLINE 0.1.1 (build 2)

- Prepared a compatibility workaround for the reported white preview/applied face: embed the fixed reference colours directly instead of resolving a single-option runtime colour configuration. Artwork, glyphs, glow and full motion are unchanged.
- Added a regression that rejects runtime palette references in REDLINE's fixed-colour output, and line breaks for useful parser error locations. HALO's three selectable palettes remain unchanged.
- The user confirmed REDLINE 0.1.0 turns white in both preview and applied mode while HALO restores normal rendering. Theme-colour fallback is a hypothesis until renderer logs or the update's device test confirm it; local validation is not a claim that the watch issue is resolved.

## Diagnostics 0.3.1 (build 5)

- Added COLLECT RENDERER DIAGNOSTICS: one read-only capture of existing process/log buffers, filtered to attributed renderer warnings/errors and crash stacks for review and explicit copying.
- Added missing-source labels, deduplication, an 80-entry summary bound and address/identifier filtering. Raw system logs stay private; buffers are never cleared, no continuous logger is started and battery intervals block this action.
- Added known REDLINE 0.1.1 provenance. Pairing, signatures, install checks and the sole network permission are preserved.

## REDLINE 0.1.0 (build 1)

- Added a standalone reference-derived black/red HUD: DUNGEONS name, angular horizontal 12/24-hour clock, full uppercase date, steps, battery instrument and editable Timer provider slot.
- Added faster counter-rotating 18/12-second main carriers with continuous speed modulation, 8/10/24-second instrument verniers, subtle pulse, radar sweep, seconds beacon and bounded two-unit depth. Seven individual switches start enabled; disabled effects return to static poses and overlays disappear.
- Added restrained red glow using layered narrow strokes and original pre-rendered masks. Readouts stay fixed; ambient is dim time only on black. WFF 4/API 36 packaging contains no code or permissions.
- Shared numeric/vector backends now support local pivots and positioned masks while HALO's resources remain byte-identical. Added full previews, aligned reference review, motion/edge/glyph checks and independent face release tags.
- Official memory evaluation passes at 3,204,224 active bytes and 38,016 ambient bytes. REDLINE rendering, motion, Timer and performance still need device acceptance; no battery improvement is claimed.

## Diagnostics 0.3.0 (build 4)

- Added HALO/REDLINE catalogue-based APK installation and installed-version verification against the selected face's own package. Known face labels/provenance and palette choices now follow the selected face.
- Preserved pairing, signature/resource checks, sole network permission, local-only operations and copyable reports. APK inspection regressions now use packaged APKs from both faces.
- The user confirmed HALO installs and displays successfully through helper 0.2.1. Their positive performance feedback is recorded as qualitative; controlled trace and battery results remain unavailable.

## Diagnostics 0.2.1 (build 3)

- Fixed valid release APKs being rejected as missing a WFF watch face. Resolve `raw/watchface` through the APK's resource table so AAPT2's shortened ZIP paths are supported.
- Added regressions against an actual packaged HALO APK, while retaining signature, package, permissions and executable-content checks.
- Show APK inspection progress and rejection reasons beside the picker. Starting a new selection clears the previous selection so a failed replacement cannot install the old file accidentally.
- The user confirmed helper pairing succeeds. Corrected APK selection and watch installation still require device acceptance; the update preserves the existing pairing identity.

## Diagnostics 0.2.0 (build 2)

- Added local HALO APK selection and installation through the helper's existing watch pairing. Wear Installer 2 is no longer required.
- Added release-signature, package, resource-only footprint and watch/API checks, bounded streamed transfer and installed-version verification. Compatible updates preserve data; no automatic uninstall or forced downgrade is performed.
- Added CHECK CONNECTION and copyable errors with distinct pairing, network and package-manager guidance. Installation is blocked during a saved battery test.
- Kept the same package/signing identity and sole INTERNET permission. The document picker needs no storage or phone-install permission. APKs are chosen locally; there are no automatic downloads or uploads.
- Real phone file selection, pairing and watch installation still require device acceptance. Local checks do not claim they are verified on the user's watch.

## Diagnostics 0.1.0 (build 1)

- Added a separate phone helper: pair with the watch, run a performance test or save battery start/end readings, review the result and copy diagnostics to paste into the chat.
- Kept Wear Installer 2 as the face installer. Bugjaeger is optional for manual diagnostics.
- Added local trace analysis, persistent battery starts, charging/reset/settings checks and explicit unavailable metrics. No continuous logger runs during the battery interval.
- Restricted networking to private numeric watch addresses. Pairing keys/raw captures stay in non-backed-up phone storage; reports are copied only on request, with no analytics or automatic uploads.
- Phone/watch pairing, native processor execution, UI and real data-source availability still need device acceptance. No measured optimization results have been recorded.

## 0.1.0 (build 1)

- Added HALO: a cyan-and-amber sci-fi HUD with stacked dot-matrix time, date, steps, battery and an editable timer shortcut.
- Added three palettes and seven separate motion switches, all enabled initially.
- Added a static time-only ambient fallback; normal use assumes AOD is off.
- Added shared previews, resource reproduction checks, WFF/memory validation and signed local release packaging.
- Added phone-only diagnostic collection and local battery/Perfetto analysis for optimizing HALO and future faces.
- Device rendering, Timer selection, diagnostic capabilities and real battery/performance results still require the first watch installation. This release records no measured battery savings.
