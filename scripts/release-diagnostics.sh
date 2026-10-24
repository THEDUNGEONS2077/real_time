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
Phone helper for HALO and REDLINE. Install/update this APK on the Android phone to retain its existing pairing. Choose either face APK, review its identity and tap INSTALL TO WATCH. Version verification now targets the chosen face's own package.

Pair once, install a face, run performance captures or battery endpoints, review the result and tap COPY DIAGNOSTICS. Face and palette choices now match HALO or REDLINE. Pairing keys and raw captures remain private and non-backed-up; there are no analytics, cloud endpoints or automatic uploads/downloads. Only a validated private numeric watch address is accepted.

The helper preserves release-signature/resource-only checks, bounded streamed installation, explicit-copy reports and the battery-test exclusion. No extra Android permission is added. Packaged-APK selection tests cover both faces, including optimized WFF resource paths.

The user confirmed successful HALO installation/display through 0.2.1. REDLINE's first installation, new selector, native trace processing and remaining device acceptance still need testing. Requires an ARM64 phone running Android 13 or newer. Full instructions: diagnostics/phone/README.md.

EOF
gh release create "$TAG" "$OUT/$NAME" "$OUT/SHA256SUMS" "$OUT/build-commit.txt" --prerelease --target "$(git rev-parse HEAD)" --title "real_time diagnostics $VERSION (build $BUILD)" --notes-file "$NOTES"
