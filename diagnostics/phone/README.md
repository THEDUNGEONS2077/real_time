# real_time diagnostics: phone helper

Install this separate APK on the **Android phone**, by opening the downloaded APK in the phone's package installer. It supports ARM64 phones running Android 13 or newer, including the project's S25 Ultra. Keep using Wear Installer 2 to install HALO on the watch. Bugjaeger is not needed for this flow.

The routine is **pair once → run a test → review → COPY DIAGNOSTICS → paste into the chat**. Battery tests have separate start/finish buttons so no connection or logger needs to run during normal wear.

## Pair once

1. Put phone and watch on the same Wi-Fi network. Enable the watch's Developer options and Wireless debugging; enable ADB debugging if separately shown.
2. Open the helper's WATCH CONNECTION section. Enter the numeric Wi-Fi address shown on the watch.
3. On the watch, choose Pair new device. Enter its **pairing port** and six-digit code in the helper, then tap PAIR WITH WATCH. The code is not saved.
4. Return to the watch's main Wireless debugging screen. Enter its **connection port** in the helper. It is usually different from the pairing port.

Pairing belongs to this helper's private identity, so Wear Installer 2's pairing is not shared automatically. Later tests reuse the helper's identity. When wireless debugging is enabled again, its connection port can change; update that field without pairing again. Clear data/uninstall or remove the identity on the watch if you want to revoke it.

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

- The only Android permission is INTERNET, which Android also requires for a direct Wi-Fi connection to the watch. Application networking accepts only numeric private-network IPv4 addresses, with no DNS or public destinations. No ads, analytics, account, cloud endpoint, automatic upload, background service, clipboard reading, or general ADB command console is included.
- Pairing keys and raw captures stay in the phone app's private, non-backed-up storage. Android cloud backup and device transfer are disabled for them. The clipboard receives only the readable summary after an explicit tap; addresses, email-shaped values, pairing keys, boot IDs and complete raw history are omitted.
- Android may clear copied text automatically. Clipboard content is marked sensitive so Android's clipboard preview does not expose the report unnecessarily. Paste when ready; nothing is sent to the chat automatically.
- DELETE LOCAL REPORTS removes this phone's captures and summaries while retaining pairing. Finish or discard a pending battery test first. Temporary watch files belonging to completed helper runs are removed after transfer; manually collected runs are left alone.

## Build and verify

```bash
bash scripts/setup-phone-tools.sh
./gradlew :diagnostics:phone:testDebugUnitTest :diagnostics:phone:assembleDebug
bash scripts/release-diagnostics.sh --verify-only
```

The release check builds/signs the helper, checks its certificate, exact permission list, lack of background components, processor checksum, embedded shared collector and native-library allow-list. It writes `dist/diagnostics/real_time-diagnostics-v0.1.0.apk`, checksums and source commit. Publishing uses a separate `diagnostics-v0.1.0` prerelease and requires approval before pushing or publishing.

Dependencies are pinned: libadb-android 3.1.1, spake2-android 2.2.1, Conscrypt 2.5.3, Bouncy Castle 1.79 and Google's Android ARM64 Perfetto processor v53.0. The latter's SHA-256 is checked both when downloaded and inside the signed APK. Pairing uses the library's PAKE primitives with a local adapter adding socket timeouts and cancellation. See THIRD_PARTY.md for upstream links and license choices.

Lint currently reports the deliberate API-36/ARM64 target and self-signed-certificate trust handling inside the pinned ADB/crypto dependencies. ADB uses pairing codes and key authentication rather than public web certificate authorities. The app does not use these trust managers for HTTP or other public connections.

Device acceptance still requires the user's phone and watch: pairing/reconnection, the UI and copy button, native processor execution, actual data-source availability, battery-start recovery and report completeness. Local build/unit/lint checks cannot replace that device verification. No real battery improvement is claimed yet.
