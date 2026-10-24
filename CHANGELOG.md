# Changelog

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
