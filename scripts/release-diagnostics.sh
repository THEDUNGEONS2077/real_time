#!/usr/bin/env bash
# Phone delivery: verify and package locally; publishing is an explicit, separately approved action.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
PUBLISH=false; VERIFY_ONLY=false
for arg in "$@"; do
    case "$arg" in --publish) PUBLISH=true;; --verify-only) VERIFY_ONLY=true;; *) echo "Unknown option: $arg" >&2; exit 2;; esac
done
if $PUBLISH && $VERIFY_ONLY; then echo 'Cannot combine --publish and --verify-only.' >&2; exit 2; fi
fail() { echo "ERROR: $*" >&2; exit 1; }
BT="${ANDROID_HOME:-$HOME/Android/Sdk}/build-tools/36.0.0"
OUT=dist/diagnostics
mkdir -p "$OUT" out/verification/phone
[[ -f keystore.properties ]] || fail 'Release key missing.'
[[ -f .tools/perfetto-android-v53.0/trace_processor_shell ]] || fail 'Run scripts/setup-phone-tools.sh first.'
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' diagnostics/phone/build.gradle.kts)
BUILD=$(sed -n 's/.*versionCode = \([0-9]*\).*/\1/p' diagnostics/phone/build.gradle.kts)

# Functional tests include private destinations, bounded APK transfer, install failures and report redaction.
./gradlew :diagnostics:phone:testDebugUnitTest :diagnostics:phone:assembleRelease :diagnostics:phone:lintRelease --console=plain
APK=diagnostics/phone/build/outputs/apk/release/phone-release.apk
[[ -f "$APK" ]] || fail 'Phone APK missing.'
"$BT/apksigner" verify --print-certs "$APK" > out/verification/phone/signature.txt
ACTUAL=$(sed -n 's/.*certificate SHA-256 digest: //p' out/verification/phone/signature.txt | head -1 | tr 'A-F' 'a-f')
[[ "$ACTUAL" == "$(tr -d '\r\n' < signing-certificate.sha256)" ]] || fail 'Unexpected signing certificate.'
"$BT/aapt2" dump permissions "$APK" > out/verification/phone/permissions.txt
PERMISSIONS=$(sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" out/verification/phone/permissions.txt | sort)
[[ "$PERMISSIONS" == android.permission.INTERNET ]] || fail 'Only the direct-local-network permission is allowed.'
"$BT/aapt2" dump xmltree "$APK" --file AndroidManifest.xml > out/verification/phone/manifest.txt
if grep -qE 'E: (service|receiver|provider)' out/verification/phone/manifest.txt; then fail 'Unexpected background component.'; fi
grep -q 'android:allowBackup.*false' out/verification/phone/manifest.txt || fail 'Backup must be disabled.'
grep -q 'android:extractNativeLibs.*true' out/verification/phone/manifest.txt || fail 'Processor must be extracted by the package installer.'
"$BT/aapt2" dump badging "$APK" > out/verification/phone/package.txt
grep -q "package: name='com.thedungeons2077.realtime.diagnostics'" out/verification/phone/package.txt || fail 'Unexpected phone package.'

# Check shipped analysis code and the collector byte for byte against their pinned inputs.
PROCESSOR_SHA=$(unzip -p "$APK" lib/arm64-v8a/libtrace_processor.so | sha256sum | cut -d' ' -f1)
[[ "$PROCESSOR_SHA" == ef7118426cc3ea0a0402c6c6978708ab8717b8df7d5ca1e6ec64ae72cde8a4ed ]] || fail 'Processor pin changed in packaging.'
COLLECTOR_SHA=$(unzip -p "$APK" assets/capture.sh | sha256sum | cut -d' ' -f1)
[[ "$COLLECTOR_SHA" == "$(sha256sum tools/measure/capture.sh | cut -d' ' -f1)" ]] || fail 'Shipped collector differs from shared source.'
unzip -Z1 "$APK" > out/verification/phone/apk-files.txt
NATIVE=$(grep '^lib/' out/verification/phone/apk-files.txt | sort)
EXPECTED=$(printf '%s\n' lib/arm64-v8a/libconscrypt_jni.so lib/arm64-v8a/libspake2.so lib/arm64-v8a/libtrace_processor.so | sort)
[[ "$NATIVE" == "$EXPECTED" ]] || fail 'Unexpected native library or architecture.'

# Package only the app and public provenance. Reports and keys never leave local private storage.
NAME="real_time-diagnostics-v$VERSION.apk"
cp "$APK" "$OUT/$NAME"
git rev-parse HEAD > "$OUT/build-commit.txt"
(cd "$OUT" && sha256sum "$NAME" build-commit.txt > SHA256SUMS)
echo "Verified phone helper: $OUT/$NAME (build $BUILD)"
$PUBLISH || exit 0

# User approval is required for this branch, each push and each published release.
[[ -z $(git status --porcelain) ]] || fail 'Commit first.'
git fetch origin
[[ $(git rev-parse HEAD) == "$(git rev-parse '@{u}')" ]] || fail 'Push the approved commit first.'
TAG="diagnostics-v$VERSION"
! gh release view "$TAG" >/dev/null 2>&1 || fail 'Release already exists.'
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
cat > "$NOTES" <<'EOF'
Phone helper for HALO and future real_time watch faces. Install or update this APK on the Android phone. It now installs locally selected HALO watch-face APKs using the same pairing as diagnostics; Wear Installer 2 is optional.

Pair once with the watch, run a performance test or start/finish a battery interval, review the readable report and tap COPY DIAGNOSTICS. Raw captures and pairing keys stay locally; there are no analytics or automatic uploads. The only network destination accepted is the watch's private numeric Wi-Fi address.

Choose the HALO watch-face APK through Android's file picker, review its version and tap INSTALL TO WATCH. The helper checks its release signature/resource-only footprint, watch compatibility and installed version. No broad storage permission, automatic download, uninstall or forced downgrade is added. Installation is blocked during a battery test. CHECK CONNECTION and copyable error reports help investigate connection problems.

This update fixes valid HALO APKs being rejected as missing a WFF watch face: the helper now resolves optimized filenames through the APK's resource table. Selection progress and errors appear beside the picker. Update the helper normally to keep its successful pairing, then select the same HALO APK again.

Requires an ARM64 phone running Android 13 or newer. The user has confirmed pairing succeeds; corrected file selection, installation, native trace processing and remaining UI acceptance still need device testing. Unsupported metrics are reported as unavailable. Full instructions: diagnostics/phone/README.md in the repository.
EOF
gh release create "$TAG" "$OUT/$NAME" "$OUT/SHA256SUMS" "$OUT/build-commit.txt" --prerelease --target "$(git rev-parse HEAD)" --title "real_time diagnostics $VERSION (build $BUILD)" --notes-file "$NOTES"
