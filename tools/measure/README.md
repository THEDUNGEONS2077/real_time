# Phone-only diagnostics

For the preferred button-based flow, use the [real_time phone helper](../../diagnostics/phone/README.md): pair once, install the face, run a test, review the report, tap COPY DIAGNOSTICS and paste into the chat. It embeds this same collector and performs trace analysis on the phone. Wear Installer 2 is optional. The manual workflow below is optional.

The watch face cannot log code-based telemetry. This toolkit collects existing watch diagnostics through [Bugjaeger](https://sisik.eu/bugjaeger) on the phone, then analyzes exported files locally. No PC-to-watch ADB connection is used, and there is no companion logger consuming power throughout the day.

## Prepare once

1. Pair Bugjaeger with the watch as described in the root README. Pairing and connection ports differ.
2. Download `real-time-capture.sh`, `run.example.json` and `build-commit.txt` from the approved prerelease.
3. In Bugjaeger's Files tab, upload the script to `/data/local/tmp/real-time-capture.sh` on the **watch**. Open its interactive shell. Commands here run directly on the watch; do not prefix them with `adb shell`.
4. Run the probe below, using a distinct run ID for each experiment or repetition. IDs allow letters, digits, hyphens and underscores only.

```sh
sh /data/local/tmp/real-time-capture.sh probe halo-full-01
```

The probe checks Perfetto data sources, trace categories, services, battery fields, firmware and Timer candidates. Command failures are saved with errors and status entries. Export the probe even when sources are unavailable; we will use the actual device capabilities rather than guessing support.

## Performance capture

For a broken face preview/applied render, use the helper's COLLECT RENDERER DIAGNOSTICS before performance testing. Reproduce the issue once, restore a readable face if needed, then collect promptly. It reads existing buffers without clearing logs or starting a continuous logger, and provides a filtered report for explicit copying. Raw system logs stay private. The optional manual equivalent is `sh /data/local/tmp/real-time-capture.sh renderer redline-render-01`; export that private run directory if requested. Source failures and absent errors are not proof of successful rendering.

Before each run, choose the intended HALO switches. Keep the same palette, brightness, connectivity and watch position. Turn AOD off and temporarily use a one-minute screen timeout, recording its previous value so it can be restored. Keep the watch unplugged and at a comparable temperature.

```sh
sh /data/local/tmp/real-time-capture.sh trace halo-full-01
```

The trace lasts 30 seconds with an 8 MiB ring buffer. Return the watch to HALO promptly and keep the face visible. Do not open other apps or record a video during the trace. Record any visibility interruption. After it finishes, the phone command reports the export directory. A missing completion marker or failed source is not treated as a successful zero-cost measurement.

Use the sequence in ../../OPTIMIZATION.md: three runs each of full motion, all optional effects off, then each effect disabled individually. New repetition IDs, such as `halo-full-02` and `halo-no-tilt-01`, prevent overwriting earlier captures. There are 27 initial captures across the nine configurations. Restore the normal timeout after the short-test session.

The trace includes wireless debugging overhead. Hold that overhead constant across performance runs. It is not the day-long battery test.

## Twenty-four-hour battery interval

Run matched stock-face and full-HALO intervals. Use a comparable starting charge and normal habits, with AOD off in both. Record brightness, timeout, connectivity, workouts, notifications and unusual usage. Do not reset battery statistics.

At the beginning, while unplugged:

```sh
sh /data/local/tmp/real-time-capture.sh probe halo-day-01
sh /data/local/tmp/real-time-capture.sh snapshot halo-day-01 start
```

Turn wireless debugging off immediately after the start snapshot. Wear the watch normally. Approximately 24 hours later, before charging, briefly reconnect from the phone and run:

```sh
sh /data/local/tmp/real-time-capture.sh snapshot halo-day-01 end
```

Export and turn debugging off again. If the watch needs charging before 24 hours, capture the endpoint first and record the shorter duration; do not present it as a matched full-day run. Recharging, rebooting, an OS update or different settings can make a comparison inconclusive. A single day's difference is not proof that the face alone caused it.

## Export through the phone

To pull one file rather than many, bundle the completed run in the watch shell:

```sh
tar -cf /data/local/tmp/halo-day-01.tar -C /data/local/tmp/real_time halo-day-01
```

Use Bugjaeger's Files tab to download `/data/local/tmp/halo-day-01.tar` to the phone. Transfer that file to the development workspace through the normal file-sharing route. Keep each incoming export in its own new directory under `measurements/raw/`; raw files and reports are gitignored and never release assets.

Import into a new directory, treating archive contents only as data:

```bash
python3 -I tools/measure/import.py measurements/raw/incoming/halo-day-01.tar measurements/raw/imported-day-01
cp tools/measure/run.example.json measurements/raw/imported-day-01/halo-day-01/run.json
```

Edit the copied `run.json` with the actual run ID, build commit from the release, face, switches, palette, firmware from `probe/firmware.txt`, brightness, timeout, connectivity and notes. Use `kind: "battery"` for daily runs or `"performance"` for traces. Stock-face runs use their real face name, firmware/version and `commit: "system"`; HALO-only switches are false for stock.

## Analyze locally

```bash
npm run measure -- --input measurements/raw/imported-day-01/halo-day-01
```

Outputs are `analysis/report.json`, `analysis/report.csv` and `analysis/report.md`. Missing fields are null/unavailable. Battery results describe the whole watch; Android's modeled mAh is explicitly an estimate. Flags identify charging, reboots, statistics resets, history gaps, unsupported checks and changed endpoint settings.

For traces, install the checksum-pinned host processor once, then pass its absolute path:

```bash
bash scripts/setup-perfetto.sh
npm run measure -- --input measurements/raw/imported-full-01/halo-full-01 --trace-processor "$PWD/.tools/perfetto-v53.0/trace_processor_shell"
```

The first trace report lists process CPU totals and available frame layers. Inspect those with the exported process list. Add the discovered exact `rendererProcess` and/or `rendererLayer` to run.json, then rerun analysis for those metrics. Do not assume that the HALO package is the renderer process. Unknown attribution remains unavailable. The processor is a host tool and does not connect to the watch.

To compare against another raw run:

```bash
npm run measure -- --input measurements/raw/imported-day-01/halo-day-01 --baseline measurements/raw/imported-stock-01/stock-day-01
```

`comparison.json` reports extra percentage points/hour, a clearly labelled 24-hour rate projection and qualification flags. Check all flags and operator notes before drawing conclusions. Match firmware, brightness, timeout, connectivity and AOD. The implementation cannot detect every change in activity or notification load.

## Keep what we learn

Review raw outputs locally. Copy only a checked summary to `measurements/reviewed/`, then record the result, visual tradeoff, settings, build, repetitions and confidence in ../../OPTIMIZATION.md. Future watch faces must consult those findings and use this protocol. No measured improvement is recorded until real watch data exists.
