#!/usr/bin/env bash
# Host setup: fetch the official Android ARM64 Perfetto processor for offline phone analysis.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEST="$ROOT/.tools/perfetto-android-v53.0"
SHA=ef7118426cc3ea0a0402c6c6978708ab8717b8df7d5ca1e6ec64ae72cde8a4ed
# Pin and checksum come from Google's v54.0 tools/trace_processor manifest.
if [[ ! -f "$DEST/trace_processor_shell" ]]; then
    mkdir -p "$ROOT/.tools"
    DOWNLOAD=$(mktemp -d "$ROOT/.tools/phone-processor-download.XXXXXX")
    curl -fL --retry 2 -o "$DOWNLOAD/trace_processor_shell" https://commondatastorage.googleapis.com/perfetto-luci-artifacts/v53.0/android-arm64/trace_processor_shell
    printf '%s  %s\n' "$SHA" "$DOWNLOAD/trace_processor_shell" | sha256sum -c -
    mkdir -p "$DEST"
    mv "$DOWNLOAD/trace_processor_shell" "$DEST/trace_processor_shell"
    rmdir "$DOWNLOAD"
fi
printf '%s  %s\n' "$SHA" "$DEST/trace_processor_shell" | sha256sum -c -
