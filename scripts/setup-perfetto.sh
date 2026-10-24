#!/usr/bin/env bash
# Host analysis tooling: fetch a pinned, checksum-verified Perfetto binary, never a phone connection.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'This pin targets Linux x86_64.' >&2; exit 2; }
DEST="$ROOT/.tools/perfetto-v53.0"
FILE="$DEST/trace_processor_shell"
SHA=ad41bda12a862bc6ad560d3bc99d9381c34a28bd5fec8e9a94f6fb1d1380ad60

# Source: the official v54.0 bootstrap manifest pins this v53.0 prebuilt and digest.
# https://github.com/google/perfetto/blob/v54.0/tools/trace_processor
if [[ ! -e "$FILE" ]]; then
  mkdir -p "$ROOT/.tools"
  SCRATCH=$(mktemp -d "$ROOT/.tools/perfetto-download.XXXXXX")
  curl -fL --retry 2 -o "$SCRATCH/trace_processor_shell" https://commondatastorage.googleapis.com/perfetto-luci-artifacts/v53.0/linux-amd64/trace_processor_shell
  printf '%s  %s\n' "$SHA" "$SCRATCH/trace_processor_shell" | sha256sum -c -
  mkdir -p "$DEST"
  mv "$SCRATCH/trace_processor_shell" "$FILE"
  rmdir "$SCRATCH"
fi
printf '%s  %s\n' "$SHA" "$FILE" | sha256sum -c -
chmod 755 "$FILE"
printf 'Trace processor: %s\n' "$FILE"
