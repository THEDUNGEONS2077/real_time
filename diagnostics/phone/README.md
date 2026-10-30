# real_time installer

A small Android app for the **phone** (ARM64, Android 13+). It sends real_time watch-face APKs to the watch. Install it by opening its APK on the phone. Updating over the old "real_time diagnostics" app keeps your pairing.

Installer **0.7.3** adds JARVIS to the accepted face catalogue, alongside HALO, REDLINE, CIPHER and NEXUS. Update the installer on the phone before choosing a JARVIS APK; older versions reject that unknown package. Install over the existing helper to retain pairing. This update changes only the catalogue; installation checks, transport, privacy and permissions stay the same.

## First time: pair

1. **Turn on debugging.** On the watch, go to Settings → About watch → Software information and tap Software version until developer mode is on. Then go to Developer options → Wireless debugging. Phone and watch must be on the same Wi-Fi.
2. **Enter the address.** In the installer, enter the watch's Wi-Fi address.
3. **Pair.** Tap **PAIR WITH THE WATCH**. On the watch choose *Pair new device*, type its pairing port and six-digit code into the installer, then tap **PAIR**.
4. **Connect.** Enter the connection port from the main Wireless debugging screen. Tap **TEST CONNECTION** if you like; ✓ CONNECTED confirms it.

The port changes whenever debugging is turned back on; just retype it. Pairing is only needed again if connecting fails.

## Install a face

1. **Download.** Get the face APK from its GitHub prerelease onto the phone.
2. **Open it in the installer.** Either open the APK and choose **real_time installer** ("Open with"), or tap **CHOOSE FACE APK** in the app. The installer shows the face and version once it has checked the file: known face, real_time release signature, no code or permissions.
3. **Install.** Tap **INSTALL TO WATCH**. The bar fills while the file is sent, then spins while the watch installs. You get:
   - **✓ REDLINE 1.1.0 INSTALLED** (for example). If the face is already in use, the update is live; otherwise long-press the face on the watch, tap +, and pick it.
   - **✗ NOT INSTALLED**, with the reason and what to do. **COPY ERROR DETAILS** copies a summary to paste into the chat.

CANCEL stops a running action. Updates keep your saved face settings. Nothing is downgraded, uninstalled or installed without your tap.

## Privacy

- **Permissions and network:** the only permission is INTERNET, used for the direct Wi-Fi connection to a private watch address. There is no DNS or public address, no analytics, uploads or background service.
- **Storage:** pairing keys stay in private, non-backed-up storage. The chosen APK is copied privately and deleted afterwards.
- **Copied error summaries:** addresses, codes and device IDs are left out.

## Build

```bash
bash scripts/release-diagnostics.sh --verify-only   # tests, lint, signed APK → dist/diagnostics/
```

Publishing uses a `diagnostics-v*` prerelease and needs the user's approval first.
