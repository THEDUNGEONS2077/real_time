# real_time phone helper

A separate Android app for the **phone** (ARM64, Android 13+). It installs real_time faces on the watch and measures them. Install it by opening the APK on the phone. Updating over an older helper keeps its pairing and any pending battery test.

The screen is four steps, top to bottom. A status line, progress bar and CANCEL button sit above them.

## 1 · CONNECT

1. **Turn on debugging.** On the watch, go to Settings → About watch → Software information and tap Software version until developer mode is on. Then go to Developer options → Wireless debugging. Put phone and watch on the same Wi-Fi.
2. **Pair (first time only).** Enter the watch's IP address. On the watch choose *Pair new device*; type its pairing port and six-digit code into the helper, then tap PAIR WITH WATCH. The code is never saved. After pairing works, this section folds away.
3. **Connect.** Enter the connection port from the main Wireless debugging screen and tap CONNECT. A ✓ appears on the step. The port changes whenever debugging is turned back on; just retype it.

## 2 · INSTALL A FACE

Download the face APK from its GitHub prerelease onto the phone. Tap CHOOSE FACE APK, check the shown face and version, then tap INSTALL TO WATCH.
- **What the helper checks:** the package, the release certificate, and that the APK has no code and no permissions.
- **How it installs:** it streams the APK and verifies the installed version.
- **After installing:** on the watch, long-press the face and add the installed face.

## 3 · TEST SMOOTHNESS

1. **Show the face.** Put it on the watch screen with the settings you want to test. Set the screen timeout to 30 s or longer.
2. **Label the report.** Pick the same face, colours, font, size, glow, speed, style and effects in the helper. These only label the report; they do not change the watch.
3. **Run it.** Tap **RUN SMOOTHNESS TEST (20 s)** and leave both devices alone. The helper:
   - wakes the watch and finds the watch-face surface;
   - samples its frame history for 20 seconds;
   - measures the renderer's CPU, then disconnects.

The result card shows delivered fps (and the display rate), median/95th/worst frame time, missed frames and renderer CPU. Run each setup three times.

**MORE TESTS** holds the 30-second Perfetto trace (CPU by process; needs a 1-minute timeout), the 24-hour battery test (START, wear normally with debugging off, FINISH before charging), and COLLECT RENDERER DIAGNOSTICS for a blank or white face.

## 4 · REPORT

Read the report, tap COPY REPORT and paste it into the chat. Only that summary is copied. It has no addresses, pairing keys, device IDs or raw history. DELETE LOCAL REPORTS clears captures but keeps pairing.

## Privacy

- **Permissions and network:** the only permission is INTERNET, used for the direct Wi-Fi connection to a private watch address. There is no DNS or public address, no analytics, uploads, background service or general command console.
- **Commands it runs:** a fixed set, plus a screen wake-up before tests. The trace and battery tests write temporary files under `/data/local/tmp` and remove them afterwards. Watch-supplied names are single-quoted and values validated.
- **Storage:** pairing keys and raw captures stay in private, non-backed-up storage. The copied report is marked sensitive.

## Build

```bash
bash scripts/setup-phone-tools.sh
bash scripts/release-diagnostics.sh --verify-only   # tests, lint, signed APK → dist/diagnostics/
```

Publishing uses a `diagnostics-v*` prerelease and needs the user's approval first.
