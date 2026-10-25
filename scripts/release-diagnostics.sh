#!/usr/bin/env bash
# Phone installer delivery: verify and package locally; publishing is an explicit, separately approved action.
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
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' diagnostics/phone/build.gradle.kts)
BUILD=$(sed -n 's/.*versionCode = \([0-9]*\).*/\1/p' diagnostics/phone/build.gradle.kts)

# Functional tests include private destinations, bounded APK transfer, install failures and error redaction.
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
"$BT/aapt2" dump badging "$APK" > out/verification/phone/package.txt
grep -q "package: name='com.thedungeons2077.realtime.diagnostics'" out/verification/phone/package.txt || fail 'Unexpected phone package.'

# Only the transport's own native libraries may ship: no analysis tools or collectors.
unzip -Z1 "$APK" > out/verification/phone/apk-files.txt
NATIVE=$(grep '^lib/' out/verification/phone/apk-files.txt | sort)
EXPECTED=$(printf '%s\n' lib/arm64-v8a/libconscrypt_jni.so lib/arm64-v8a/libspake2.so | sort)
if grep -q '^assets/capture.sh$' out/verification/phone/apk-files.txt; then fail 'The installer must not ship the measurement collector.'; fi
[[ "$NATIVE" == "$EXPECTED" ]] || fail 'Unexpected native library or architecture.'

# Package only the app and public provenance. Reports and keys never leave local private storage.
NAME="real_time-diagnostics-v$VERSION.apk"
cp "$APK" "$OUT/$NAME"
git rev-parse HEAD > "$OUT/build-commit.txt"
(cd "$OUT" && sha256sum "$NAME" build-commit.txt > SHA256SUMS)
echo "Verified phone installer: $OUT/$NAME (build $BUILD)"
$PUBLISH || exit 0

# User approval is required for this branch, each push and each published release.
[[ -z $(git status --porcelain) ]] || fail 'Commit first.'
git fetch origin
[[ $(git rev-parse HEAD) == "$(git rev-parse '@{u}')" ]] || fail 'Push the approved commit first.'
TAG="diagnostics-v$VERSION"
! gh release view "$TAG" >/dev/null 2>&1 || fail 'Release already exists.'
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
# Release notes come from this version's CHANGELOG section, as for the faces.
awk -v h="## Installer $VERSION (build $BUILD)" '$0==h{f=1;next} /^## /{if(f)exit} f' CHANGELOG.md > "$NOTES"
[[ -s "$NOTES" ]] || fail 'Changelog section missing.'
gh release create "$TAG" "$OUT/$NAME" "$OUT/SHA256SUMS" "$OUT/build-commit.txt" --prerelease --target "$(git rev-parse HEAD)" --title "real_time diagnostics $VERSION (build $BUILD)" --notes-file "$NOTES"
