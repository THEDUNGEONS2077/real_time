#!/usr/bin/env bash
# Release layer: build and verify locally by default; publishing requires explicit flags and approval.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
FACE=halo; PUBLISH=false; PRERELEASE=false
while (($#)); do
  case "$1" in
    --verify-only) ;;
    --face) FACE=${2:?face name required}; shift;;
    --publish) PUBLISH=true;;
    --prerelease) PRERELEASE=true;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
  shift
done
[[ "$FACE" =~ ^[a-z][a-z0-9_]*$ ]] || { echo 'Invalid face name.' >&2; exit 2; }
fail() { echo "ERROR: $*" >&2; exit 1; }
[[ -f keystore.properties ]] || fail 'Run node scripts/setup-signing.mjs first.'
COMMIT=d1cdafa953c95d5554fc54df4bc3948befbefc4d
TOOLS=${REAL_TIME_VALIDATORS:-"$ROOT/.tools/google-watchface-$COMMIT"}
[[ $(git -C "$TOOLS" rev-parse HEAD) == "$COMMIT" ]] || fail 'Validator commit differs from the pin.'
VALIDATOR="$TOOLS/third_party/wff/specification/validator/build/libs/wff-validator.jar"
MEMORY="$TOOLS/play-validations/memory-footprint/build/libs/memory-footprint.jar"
[[ -f "$VALIDATOR" && -f "$MEMORY" ]] || fail 'Run scripts/setup-validators.sh first.'
BT="${ANDROID_HOME:-$HOME/Android/Sdk}/build-tools/36.0.0"
[[ -x "$BT/aapt2" && -x "$BT/apksigner" ]] || fail 'SDK build-tools 36.0.0 missing.'
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' "faces/$FACE/build.gradle.kts")
BUILD=$(sed -n 's/.*versionCode = \([0-9]*\).*/\1/p' "faces/$FACE/build.gradle.kts")
[[ -n "$VERSION" && -n "$BUILD" ]] || fail 'Version metadata missing.'
mkdir -p out/verification dist

# Tests and reproducibility precede packaging, preventing stale generated artwork.
npm run check

# The official XML validator can print FAILED while exiting zero, so inspect its result too.
java -jar "$VALIDATOR" 4 "faces/$FACE/src/main/res/raw/watchface.xml" 2>&1 | tee out/verification/xml-validator.txt
grep -q 'PASSED' out/verification/xml-validator.txt || fail 'WFF validator did not report PASSED.'
if grep -q 'FAILED' out/verification/xml-validator.txt; then fail 'WFF validator reported failure.'; fi
./gradlew ":faces:$FACE:assembleRelease" ":faces:$FACE:lintRelease" --console=plain
APK="faces/$FACE/build/outputs/apk/release/$FACE-release.apk"
[[ -f "$APK" ]] || fail 'Release APK missing.'

# Check the built package rather than relying only on source declarations.
"$BT/apksigner" verify --print-certs "$APK" > out/verification/signature.txt
ACTUAL=$(sed -n 's/.*certificate SHA-256 digest: //p' out/verification/signature.txt | head -1 | tr 'A-F' 'a-f')
[[ "$ACTUAL" == "$(tr -d '\r\n' < signing-certificate.sha256)" ]] || fail 'Unexpected signing certificate.'
"$BT/aapt2" dump permissions "$APK" > out/verification/permissions.txt
if grep -qE 'uses-permission:|permission:' out/verification/permissions.txt; then fail 'APK declares permissions.'; fi
unzip -Z1 "$APK" > out/verification/apk-files.txt
if grep -qE '(^|/)classes[^/]*\.dex$|\.so$' out/verification/apk-files.txt; then fail 'APK contains executable code.'; fi
"$BT/aapt2" dump xmltree "$APK" --file AndroidManifest.xml > out/verification/manifest.txt
grep -q 'android:hasCode.*false\|android:hasCode.*0x0' out/verification/manifest.txt || fail 'hasCode=false missing.'
"$BT/aapt2" dump badging "$APK" > out/verification/package.txt
grep -q "package: name='com.thedungeons2077.realtime.$FACE'" out/verification/package.txt || fail 'Unexpected package ID.'
grep -q "sdkVersion:'36'" out/verification/package.txt || fail 'Unexpected minimum SDK.'
grep -q "targetSdkVersion:'36'" out/verification/package.txt || fail 'Unexpected target SDK.'

# Validate both runtime memory budgets against the signed APK.
java -jar "$MEMORY" --watch-face "$APK" --schema-version 4 --ambient-limit-mb 10 --active-limit-mb 100 --estimate-optimization 2>&1 | tee out/verification/memory.txt
java -jar "$MEMORY" --watch-face "$APK" --schema-version 4 --report > out/verification/memory.json

# Local deliverables include commands and provenance; no raw watch diagnostics are published.
OUT="dist/real_time-$FACE-v$VERSION.apk"
cp "$APK" "$OUT"
cp tools/measure/capture.sh "dist/real-time-capture.sh"
cp tools/measure/run.example.json "dist/run.example.json"
git rev-parse HEAD > dist/build-commit.txt
(cd dist && sha256sum "real_time-$FACE-v$VERSION.apk" real-time-capture.sh run.example.json build-commit.txt > SHA256SUMS)
echo "Verified local build: $OUT (build $BUILD)"
$PUBLISH || exit 0

# Invoke this branch only after the user's explicit approval of publication.
$PRERELEASE || fail 'Initial releases must use --prerelease --publish.'
[[ -z $(git status --porcelain) ]] || fail 'Commit local changes first.'
git fetch origin
[[ $(git rev-parse HEAD) == "$(git rev-parse '@{u}')" ]] || fail 'HEAD must match the approved pushed commit.'
TAG="v$VERSION"
! gh release view "$TAG" >/dev/null 2>&1 || fail 'Release already exists.'
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
awk -v h="## $VERSION (build $BUILD)" '$0==h{f=1;next} /^## /{if(f)exit} f' CHANGELOG.md > "$NOTES"
[[ -s "$NOTES" ]] || fail 'Changelog section missing.'
gh release create "$TAG" "$OUT" dist/SHA256SUMS dist/real-time-capture.sh dist/run.example.json dist/build-commit.txt --prerelease --target "$(git rev-parse HEAD)" --title "real_time $FACE $TAG (build $BUILD)" --notes-file "$NOTES"
