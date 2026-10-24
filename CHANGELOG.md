# Changelog

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
