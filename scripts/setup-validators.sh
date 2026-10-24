#!/usr/bin/env bash
# Host tooling: download a pinned Google checkout into a fresh, isolated directory.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMMIT=d1cdafa953c95d5554fc54df4bc3948befbefc4d
DEST="$ROOT/.tools/google-watchface-$COMMIT"

# Each download gets a new empty checkout. Executable project scripts stay outside it.
if [[ ! -d "$DEST" ]]; then
  mkdir -p "$ROOT/.tools"
  git clone https://github.com/google/watchface.git "$DEST"
  git -C "$DEST" checkout --detach "$COMMIT"
fi
[[ $(git -C "$DEST" rev-parse HEAD) == "$COMMIT" ]] || { echo 'Unexpected validator checkout.' >&2; exit 1; }

# The upstream play-validations build produces both jars on JDK 17.
(cd "$DEST/play-validations" && ./gradlew :validator:executable-jar :memory-footprint:executable-jar --console=plain "-Dmemory-footprint.git_hash=$COMMIT")
printf 'Official validators ready at %s\n' "$DEST"
