#!/system/bin/sh
# Phone collection layer: run in Bugjaeger on the WATCH, never through a PC.
# Usage: sh /data/local/tmp/real-time-capture.sh probe RUN_ID
#        sh /data/local/tmp/real-time-capture.sh snapshot RUN_ID start|end
#        sh /data/local/tmp/real-time-capture.sh trace RUN_ID
set -eu
umask 077

# Reject accidental host execution and path traversal before making any directories.
command -v getprop >/dev/null 2>&1 || { echo 'Run this script in the watch shell.' >&2; exit 2; }
ACTION=${1:-}; RUN_ID=${2:-}
case "$RUN_ID" in ''|*[!a-zA-Z0-9_-]*) echo 'Use a run ID containing letters, numbers, _ or -.' >&2; exit 2;; esac
case "$ACTION" in probe|snapshot|trace) ;; *) echo 'Expected probe, snapshot or trace.' >&2; exit 2;; esac
BASE=/data/local/tmp/real_time/$RUN_ID
mkdir -p "$BASE"

# Preserve command errors alongside successful captures so missing data stays explicit.
capture() {
  CAPTURE_NAME=$1; shift
  if "$@" > "$OUT/$CAPTURE_NAME.txt" 2> "$OUT/$CAPTURE_NAME.error.txt"; then
    printf '%s\tok\n' "$CAPTURE_NAME" >> "$OUT/status.tsv"
  else
    CAPTURE_CODE=$?
    printf '%s\tfailed:%s\n' "$CAPTURE_NAME" "$CAPTURE_CODE" >> "$OUT/status.tsv"
  fi
}

# Endpoints include boot identity and monotonic time for interval checks.
identity() {
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$OUT/timestamp.txt"
  date '+%s' > "$OUT/epoch.txt"
  cat /proc/uptime > "$OUT/uptime.txt"
  cat /proc/sys/kernel/random/boot_id > "$OUT/boot-id.txt" 2>/dev/null || true
  getprop ro.build.fingerprint > "$OUT/firmware.txt"
  getprop ro.product.model > "$OUT/model.txt"
}

case "$ACTION" in
  probe)
    OUT=$BASE/probe
    [ ! -e "$OUT" ] || { echo 'Probe exists; use a new run ID.' >&2; exit 2; }
    mkdir "$OUT"; identity
    capture services dumpsys -l
    capture perfetto-sources perfetto --query
    capture atrace-categories atrace --list_categories
    capture battery dumpsys battery
    capture processes ps -A
    capture display dumpsys display
    capture thermal dumpsys thermalservice
    capture timer-packages sh -c 'pm list packages | grep -iE "timer|clock|watchface|wearable"'
    capture timer-activities cmd package query-activities --brief -a android.intent.action.SET_TIMER
    capture sdk getprop ro.build.version.sdk
    ;;
  snapshot)
    ENDPOINT=${3:-}
    case "$ENDPOINT" in start|end) ;; *) echo 'snapshot requires start or end.' >&2; exit 2;; esac
    OUT=$BASE/$ENDPOINT
    [ ! -e "$OUT" ] || { echo 'Endpoint exists; use a new run ID.' >&2; exit 2; }
    mkdir "$OUT"; identity
    capture battery dumpsys battery
    capture batterystats dumpsys batterystats
    capture batterystats-checkin dumpsys batterystats --checkin
    capture batterystats-history dumpsys batterystats --history
    capture display dumpsys display
    capture power dumpsys power
    capture thermal dumpsys thermalservice
    capture brightness settings get system screen_brightness
    capture brightness-mode settings get system screen_brightness_mode
    capture timeout settings get system screen_off_timeout
    capture aod settings get secure doze_always_on
    capture wifi settings get global wifi_on
    capture bluetooth settings get global bluetooth_on
    capture airplane settings get global airplane_mode_on
    capture processes ps -A
    ;;
  trace)
    OUT=$BASE/trace
    [ ! -e "$OUT" ] || { echo 'Trace exists; use a new run ID per repetition.' >&2; exit 2; }
    mkdir "$OUT"; identity
    capture perfetto-sources perfetto --query
    capture atrace-categories atrace --list_categories
    QUERY=$OUT/perfetto-sources.txt
    CONFIG=$OUT/config.pbtxt
    # Only request sources the device advertises. No root or custom service is required.
    printf 'duration_ms: 30000\nbuffers { size_kb: 8192 fill_policy: RING_BUFFER }\n' > "$CONFIG"
    SOURCE_COUNT=0
    if grep -q 'linux.ftrace' "$QUERY"; then
      printf 'data_sources { config { name: "linux.ftrace" ftrace_config {\n' >> "$CONFIG"
      for CATEGORY in sched freq idle gfx view wm; do
        if grep -qE "^[[:space:]]*$CATEGORY[[:space:]]+-" "$OUT/atrace-categories.txt"; then
          printf 'atrace_categories: "%s"\n' "$CATEGORY" >> "$CONFIG"
        fi
      done
      printf '} } }\n' >> "$CONFIG"
      SOURCE_COUNT=$((SOURCE_COUNT + 1))
    fi
    if grep -q 'linux.process_stats' "$QUERY"; then
      printf 'data_sources { config { name: "linux.process_stats" process_stats_config { scan_all_processes_on_start: true } } }\n' >> "$CONFIG"
      SOURCE_COUNT=$((SOURCE_COUNT + 1))
    fi
    if grep -q 'android.surfaceflinger.frametimeline' "$QUERY"; then
      printf 'data_sources { config { name: "android.surfaceflinger.frametimeline" } }\n' >> "$CONFIG"
      SOURCE_COUNT=$((SOURCE_COUNT + 1))
    fi
    [ "$SOURCE_COUNT" -gt 0 ] || { echo 'No supported trace sources; export this directory for analysis.' >&2; exit 3; }
    TRACE_FILE=/data/misc/perfetto-traces/real_time_$RUN_ID.perfetto-trace
    [ ! -e "$TRACE_FILE" ] || { echo 'Trace file already exists; use a new run ID.' >&2; exit 2; }
    # Standard input works with Android SELinux restrictions on config-file locations.
    echo 'Recording for 30 seconds. Return to HALO now; keep it visible for the same duration in each run.'
    if perfetto --txt -c - -o "$TRACE_FILE" < "$CONFIG" > "$OUT/recording.txt" 2> "$OUT/recording.error.txt"; then
      date -u '+%Y-%m-%dT%H:%M:%SZ' > "$OUT/completed-at.txt"
      cp "$TRACE_FILE" "$OUT/trace.perfetto-trace"
      echo 'complete' > "$OUT/recording-status.txt"
    else
      echo 'failed' > "$OUT/recording-status.txt"
      echo 'Trace recording failed. Export the error file too.' >&2; exit 3
    fi
    ;;
esac
echo "Export $BASE using Bugjaeger Files. Turn wireless debugging off after collection."
