# real_time diagnostics: phone helper

Install this separate APK on the **Android phone**, by opening the downloaded APK in the phone's package installer. It supports ARM64 phones running Android 13 or newer, including the project's S25 Ultra. Update the existing helper normally to retain its pairing and saved battery start. This helper installs HALO on the watch as well as collecting diagnostics; Wear Installer 2 and Bugjaeger are not needed for this flow.

The routine is **pair once → choose the HALO APK → install → run a test → review → COPY DIAGNOSTICS → paste into the chat**. The same pairing is used for installation and tests. Battery tests have separate start/finish buttons so no connection or logger needs to run during normal wear.

## Pair once

1. Put phone and watch on the same Wi-Fi network. Enable the watch's Developer options and Wireless debugging; enable ADB debugging if separately shown.
2. Open the helper's WATCH CONNECTION section. Enter the numeric Wi-Fi address shown on the watch.
3. On the watch, choose Pair new device. Enter its **pairing port** and six-digit code in the helper, then tap PAIR WITH WATCH. The code is not saved.
4. Return to the watch's main Wireless debugging screen. Enter its **connection port** in the helper. It is usually different from the pairing port. Tap CHECK CONNECTION to verify the watch is reachable before choosing an APK or running a test.

Pairing belongs to this helper's private identity, so Wear Installer 2's pairing is not shared automatically. Later tests reuse the helper's identity. When wireless debugging is enabled again, its connection port can change; update that field without pairing again. Clear data/uninstall or remove the identity on the watch if you want to revoke it.

## Install HALO from this phone

1. Download the HALO **watch-face** APK from the watch-face prerelease into the phone's Downloads folder. The diagnostics APK is the separate app already installed on this phone; do not select it as a face.
2. In INSTALL WATCH FACE, tap CHOOSE FACE APK and select the local HALO APK through Android's file picker. No broad storage permission is required, and no file is downloaded automatically.
3. Review the displayed face, version/build and SHA-256. The helper checks the known HALO package, real_time release signing certificate, watch declaration and absence of code/permissions. APK reads are limited to 32 MiB. Debug builds and unrelated apps are rejected.
4. Tap INSTALL TO WATCH. The helper checks the destination is a watch with a suitable Android version, streams the private inspected copy to its package manager and verifies the installed version after an explicit Success response. Keep the helper open until it finishes.
5. On the watch, long-press the current face → add a face → choose HALO. It is not selected automatically. Verify rendering, toggles, steps/battery/date and Timer as listed in the root README. Turn wireless debugging off afterwards.

Compatible updates use the normal replace operation and preserve existing package data. The helper does not uninstall an existing face, force a downgrade or bypass signature checks. Installation is blocked until a pending battery test is finished or discarded. The temporary private APK copy is removed when replaced or the screen closes; reselect the file if Android recreates the screen.

Version 0.2.1 fixes 0.2.0 rejecting the valid HALO release with “The APK does not contain a WFF watch face.” Update the helper over the existing installation to retain pairing, then choose the same HALO APK again. Inspection now follows the APK resource table's optimized path. Progress and any rejection reason appear beside CHOOSE FACE APK, with the full error also available through COPY DIAGNOSTICS.

If an operation fails, review REPORT and tap COPY DIAGNOSTICS. Pairing, network refusal/timeout and package-manager errors have different guidance. A router-blocked Wi-Fi connection can still affect this helper; connecting the watch to a phone hotspot is a useful alternative network test. If installation is interrupted, its final state may be unknown: check the watch face list before retrying. There is no automatic retry.

## Performance: run and copy

1. On the watch, select HALO and choose the palette/effect configuration to test. Set the display timeout to one minute, leave AOD off, and keep the watch face selected and unlocked.
2. In TEST SETUP, choose the matching face, palette and effects preset. These are experiment labels, not controls that change WFF settings. Record the actual name for stock/other faces.
3. Tap RUN 30-SECOND PERFORMANCE TEST. The helper reads the watch's capabilities and settings, wakes its display, records the trace, downloads it and disconnects. Leave the watch on its face for the full recording.
4. The phone analyzes the trace locally. The watch does not run the processor. Review REPORT and tap COPY DIAGNOSTICS, then paste into the chat. Turn wireless debugging off and restore the normal display timeout after the test session.
5. Repeat each setting three times. Compare full motion, all seven optional effects off, then each effect disabled individually. Keep brightness, watch position, wrist movement, visible time and connectivity matched.

The first report lists available CPU processes and frame layers. Specific renderer CPU and frame timing stay unavailable until the correct process/surface is identified. After reviewing a report, enter exact names under OPTIONAL RENDERER SELECTION and tap REANALYZE SAVED TEST. This operates on the last saved trace without reconnecting to the watch.

The trace includes the common debugging/capture overhead. Process activity and surface frame durations do not represent exclusive watch-face energy. Missing sources, incomplete traces or processor failures are reported explicitly, never as zero cost.

## Battery: start, wear, finish, copy

1. Match the actual watch face and settings in TEST SETUP. Keep AOD off. Start at a comparable charge level, unplugged.
2. Tap START BATTERY TEST. After the start is saved, turn Wireless debugging off on the watch. The helper disconnects and does not poll or run a logger. The pending start survives app restarts.
3. Wear normally for about 24 hours. Do not charge, reboot or change test settings. Note unusual workouts, notifications, poor signal or different use so the report can be interpreted correctly.
4. Before charging, briefly enable debugging again, update the connection port if needed and tap FINISH BATTERY TEST. The saved start's configuration is retained.
5. Review the report, tap COPY DIAGNOSTICS and paste here. Turn debugging off again. Repeat with the chosen stock face under comparable conditions.

If charging is needed earlier, finish first and record the shorter interval; the report flags it rather than silently projecting it as a clean day. Other flags include changed settings, charging, reboots, clock changes, statistics resets, history gaps and unavailable checks. Treat close or noisy comparisons as inconclusive and repeat them.

## Privacy and storage

- The only Android permission is INTERNET, which Android also requires for a direct Wi-Fi connection to the watch. Application networking accepts only numeric private-network IPv4 addresses, with no DNS or public destinations. No ads, analytics, account, cloud endpoint, automatic download/upload, background service, clipboard reading, or general ADB command console is included. The document picker grants access only to the selected APK; installation takes place on the watch through ADB and requires no phone package-install permission.
- Pairing keys and raw captures stay in the phone app's private, non-backed-up storage. Android cloud backup and device transfer are disabled for them. The clipboard receives only the readable summary after an explicit tap; addresses, email-shaped values, pairing keys, boot IDs and complete raw history are omitted.
- Android may clear copied text automatically. Clipboard content is marked sensitive so Android's clipboard preview does not expose the report unnecessarily. Paste when ready; nothing is sent to the chat automatically.
- DELETE LOCAL REPORTS removes this phone's captures and summaries while retaining pairing. Finish or discard a pending battery test first. Temporary watch files belonging to completed helper runs are removed after transfer; manually collected runs are left alone.

## Build and verify

```bash
bash scripts/setup-phone-tools.sh
./gradlew :diagnostics:phone:testDebugUnitTest :diagnostics:phone:assembleDebug
bash scripts/release-diagnostics.sh --verify-only
```

The release check builds/signs the helper, checks its certificate, exact permission list, lack of background components, processor checksum, embedded shared collector and native-library allow-list. It also tests streamed transfer, incompatible watches, package-manager failures, installed-version verification, the actual packaged HALO resource table/footprint and copyable failure messages. It writes `dist/diagnostics/real_time-diagnostics-v0.2.1.apk`, checksums and source commit. Publishing uses a separate `diagnostics-v0.2.1` prerelease and requires approval before pushing or publishing.

To check an existing downloaded release after verifying its checksum, run `./gradlew :diagnostics:phone:testDebugUnitTest -PhaloSelectionFixture=/absolute/path/to/real_time-halo-v0.1.0.apk --tests '*FaceApkTest'`. Without an override, the tests build and use HALO's optimized debug APK so they do not require a private release key.

Dependencies are pinned: libadb-android 3.1.1, spake2-android 2.2.1, Conscrypt 2.5.3, Bouncy Castle 1.79 and Google's Android ARM64 Perfetto processor v53.0. The latter's SHA-256 is checked both when downloaded and inside the signed APK. Pairing uses the library's PAKE primitives with a local adapter adding socket timeouts and cancellation. See THIRD_PARTY.md for upstream links and license choices.

Lint currently reports the deliberate API-36/ARM64 target and self-signed-certificate trust handling inside the pinned ADB/crypto dependencies. ADB uses pairing codes and key authentication rather than public web certificate authorities. The app does not use these trust managers for HTTP or other public connections.

The user has confirmed pairing succeeds. Device acceptance still requires APK selection after this fix, first install and compatible update, interrupted-install recovery, reconnection, native processor execution, actual data-source availability, battery-start recovery and report completeness. Local build/unit/lint checks cannot replace that device verification. No real battery improvement is claimed yet.
