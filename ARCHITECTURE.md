# Architecture

## Build layers

`tools/compose` owns pure design data, the numeric expression AST and both renderers. A numeric motion formula is serialized to WFF and evaluated for SVG from the same tree. Geometry starts at twelve and increases clockwise in both outputs. A preview frame uses UTC fields as a synthetic local wall clock; installed WFF uses the watch's current local time.

`faces/halo` is one Android application with resources only. It declares WFF 4, API 36 and `hasCode=false`. There is no Kotlin, AndroidX, service, launcher activity, runtime permission or network code. Further faces get independent modules and package IDs.

R8 is enabled in both variants to remove AGP's generated R bytecode; resource shrinking stays off because WFF resolves artwork and labels by name. The .dev variant uses a different package and debug signing key but is not debuggable: the APK contains no application code to debug. Capture tools inspect the system renderer instead.

`tools/check` rasterizes SVG with Sharp, produces a standalone gallery and measures ambient coverage. The scene is shared, but font metrics, glow, complication content and runtime rendering can differ on the watch. These checks never stand in for device acceptance.

`tools/measure` contains the watch-shell collector and host-only analysis. It does not run inside a face. The PC processes exports; only the phone connects to the watch.

`diagnostics/phone` is the preferred native phone frontend. It embeds the shared collector, pairs directly over local Wi-Fi, downloads captures into non-backed-up storage, runs a checksum-pinned ARM64 processor on the phone and formats an explicit-copy report. Its own executable code and network permission are isolated in a separate package. Battery starts are persisted atomically; no service or live connection runs through the daily interval. Pairing identity is private and separate from Wear Installer 2's.

The same phone frontend installs locally selected face APKs. Android's document picker grants one file without a storage permission; a bounded private copy is inspected for the known face package, release signing certificate, watch feature and resource-only footprint. The user's install action streams this exact copy to Android's package manager over paired ADB, as `exec:cmd package install -r -S <bytes>`. Success requires the watch's explicit response and the registered version code. There is no automatic download, uninstall, downgrade or face selection. Interrupted commits can have an unknown final state and are not retried automatically. A saved battery interval blocks installation. Connection checks and operation failures produce copyable summaries without addresses or pairing codes.

## Generated resources

The generator returns the entire resource tree as a map and can write it to any directory. Tests build in a temporary directory and compare every file with committed resources, including PNG/WebP bytes. `--check` also rejects stale extra resources. Lockfiles pin the image toolchain; dependencies changing encoded output require intentional regeneration.

The clock uses two TimeText rows in DigitalClock with SYNC_TO_DEVICE and original bitmap glyphs. A second glyph family without glow serves the minimal ambient clock. The background is one monochrome WebP with palette tinting; the SVG backend embeds a tinted equivalent.

## Motion

The scene has seven independent configuration switches. Conditions select moving or static subtrees, so disabling an effect removes its high-frequency expressions from the selected subtree. Clock phases are bounded before sine/cosine evaluation. Ring periods divide a day; the watch's local-day source is appropriate for decoration, and changing local time can rephase it.

Interactive artwork is grouped behind an ambient variant. The ambient group contains only static time rows; the system changes the displayed time. Geometry checks include stroke thickness, bracket scale and simultaneous three-unit shifts on both axes. Full-background artwork is clipped by the round display and is exempt from the foreground safe margin.

The shortcut is a customizable complication slot with empty, short-text, monochrome-image and small-image renderings. WFF owns provider taps. No Samsung component name is guessed or bundled.

## Measurement interfaces

`capture.sh probe RUN_ID` records supported services, data sources, battery fields, processes and Timer candidates. `snapshot RUN_ID start|end` captures read-only endpoints. `trace RUN_ID` records a 30-second, 8 MiB Perfetto ring buffer from advertised sources. Existing captures are never overwritten. Commands unavailable on a device have error files and status entries.

The analyzer accepts a directory with `run.json`, optional `probe/`, `start/`, `end/` and `trace/`. Metadata schema 1 records source commit, version, face, palette, seven effect values, AOD, brightness, timeout, connectivity, firmware and operator notes. It optionally identifies the discovered renderer process and exact frame layer. It emits report.json, report.csv and report.md; `--baseline` adds comparison.json.

Battery results use whole-watch endpoint deltas. Android modeled mAh is separately named. Boot IDs, monotonic time, checkin start clock, incremental history and setting differences identify contaminated intervals. Unsupported fields remain null and uncertain intervals are flagged. Battery history is not replaced or reset by the collector.

The optional pinned Perfetto processor is invoked by explicit absolute path with argument arrays, never a shell. CPU time is grouped by process from scheduling events; frame metrics require an exact recorded surface selection. Renderer measurements remain shared-process/surface data, not exclusive face energy. Raw exports never supply code, SQL or executable paths.

Effect metadata is a boolean map so future faces can name their own effects. HALO's known seven switches are additionally required for HALO runs. Performance comparisons check trace coverage and data-loss counters rather than requiring battery endpoints that do not belong to short traces.

## Release gates

The release script validates the signed APK, not just the source: package identity, SDKs, certificate, no permissions, no DEX/native libraries and official memory limits. It parses the XML validator's PASS/FAIL output because that validator may return status zero on invalid XML. Verify-only mode has no remote GitHub operations.

Generated artwork and source are committed; keys, captures, analysis output, downloaded validators and build products are ignored. Reviewed measurements and optimization decisions may be committed only after checking their contents.
