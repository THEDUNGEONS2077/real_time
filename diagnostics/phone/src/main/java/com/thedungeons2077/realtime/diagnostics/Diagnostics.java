/** Application layer: capture from the watch, analyze on the phone and retain an explicit-copy report. */
package com.thedungeons2077.realtime.diagnostics;

import android.content.Context;
import android.util.Base64;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;
import java.util.regex.Pattern;

/** Session controller. Only explicit actions connect; battery intervals have no persistent connection. */
public final class Diagnostics {
    private final Context context;
    private final File storage, pendingFile, reportFile;
    private volatile WatchConnection connection;
    private final Consumer<String> progress;
    private static final String COLLECTOR = "/data/local/tmp/real-time-capture.sh";
    private static final String[] SNAPSHOT_FILES = {"epoch", "timestamp", "uptime", "boot-id", "firmware", "model", "battery", "batterystats-checkin", "batterystats-history", "display", "power", "thermal", "brightness", "brightness-mode", "timeout", "aod", "wifi", "bluetooth", "airplane", "status"};

    /** Keep raw diagnostics and pairing identity in non-backed-up private storage. */
    public Diagnostics(Context appContext, Consumer<String> status) {
        context = appContext.getApplicationContext(); progress = status;
        storage = new File(context.getNoBackupFilesDir(), "diagnostics");
        pendingFile = new File(storage, "pending.json"); reportFile = new File(storage, "latest-report.txt");
        storage.mkdirs();
    }

    /** Whether the app has a saved battery start across process death or phone restart. */
    public boolean batteryPending() { return pendingFile.isFile(); }
    /** Read only the reviewed-size summary, never a clipboard or raw dump. */
    public String latestReport() {
        try { return reportFile.isFile() ? readText(reportFile) : ""; }
        catch (IOException error) { return ""; }
    }

    /** Pairing creates an ADB identity on this phone; it does not install anything on the watch. */
    public void pair(LocalEndpoint endpoint, String code) throws Exception {
        progress.accept("Pairing with the watch…");
        try { connection = new WatchConnection(context); connection.pairWatch(endpoint, code); }
        finally { disconnect(); }
    }

    /** Confirm the saved pairing can reach a real watch, without requiring HALO or starting a test. */
    public String checkConnection(LocalEndpoint endpoint) throws Exception {
        try {
            connect(endpoint);
            int api = WatchInstallSession.watchApi(connection);
            String model = Measurements.clean(command("getprop ro.product.model"));
            String report = operationHeader("CONNECTION") + "Watch: " + model + "\nAndroid API: " + api
                    + "\nConnection and watch identity verified. You can choose and install a real_time face APK.\n";
            writeText(reportFile, report); return report;
        } finally { disconnect(); }
    }

    /** Capture existing renderer logs once, including errors that prevented a preview from opening. */
    public String rendererDiagnostics(LocalEndpoint endpoint, JSONObject setup) throws Exception {
        if (batteryPending()) throw new IllegalStateException("Finish or discard the battery test before renderer diagnostics.");
        String id = runId(); File run = new File(storage, id); run.mkdirs();
        JSONObject metadata = new JSONObject(setup.toString());
        String processes, main, crash, status;
        try {
            connect(endpoint); prepare(); collectInfo(metadata);
            progress.accept("Reading existing renderer warnings and crash records…");
            capture("renderer", id, "", run);
            File directory = new File(run, "renderer"); directory.mkdirs();
            for (String name : new String[]{"processes.txt", "renderer-main.txt", "renderer-crash.txt", "status.tsv"})
                Files.write(new File(directory, name).toPath(), connection.file(remote(id, "renderer/" + name), 4 * 1024 * 1024));
            processes = readText(new File(directory, "processes.txt")); main = readText(new File(directory, "renderer-main.txt"));
            crash = readText(new File(directory, "renderer-crash.txt")); status = readText(new File(directory, "status.tsv"));
            save(metadata, new File(run, "run.json")); cleanup(id);
        } finally { disconnect(); }
        return finish(header("RENDERER", id, metadata) + RendererReport.summarize(processes, main, crash, status), run);
    }

    /** Install a reviewed private APK copy, using the same pairing as the measurement workflow. */
    public String install(LocalEndpoint endpoint, FaceApk apk) throws Exception {
        if (batteryPending()) throw new IllegalStateException("Finish or discard the battery test before installing a face.");
        apk.verifyUnchanged();
        try {
            connect(endpoint);
            progress.accept("Checking watch compatibility…");
            WatchInstallSession.install(connection, apk.file, apk.packageName, apk.size, apk.minSdk, apk.versionCode,
                    percent -> progress.accept("Sending " + FaceCatalog.name(apk.packageName) + " to the watch: " + percent + "%. Waiting for Android to finish installation…"));
            String report = operationHeader("INSTALLATION") + apk.summary()
                    + "\nResult: watch reported Success; installed version verified.\n"
                    + "On the watch, long-press the current face, add a face and select " + FaceCatalog.name(apk.packageName) + ".\n"
                    + "Turn wireless debugging off when finished. Rendering and Timer still need device acceptance.\n";
            writeText(reportFile, report); return report;
        } finally { disconnect(); }
    }

    /** Save failures as copyable diagnostics so connection errors do not require retyping or screenshots. */
    public String recordFailure(String action, Throwable error) {
        String report = operationHeader(action) + OperationFailure.describe(action, error);
        try { writeText(reportFile, report); } catch (IOException ignored) { }
        return report;
    }

    private static String operationHeader(String action) {
        return "REAL_TIME HELPER / " + action + "\nHelper: " + BuildConfig.VERSION_NAME + " / " + BuildConfig.SOURCE_COMMIT
                + "\nTime (UTC): " + java.time.Instant.now() + "\nAddresses, pairing codes and device IDs are omitted. No automatic upload.\n\n";
    }

    /** Collect and analyze a 30-second trace. Watch settings remain under the user's control. */
    public String performance(LocalEndpoint endpoint, JSONObject setup) throws Exception {
        if (batteryPending()) throw new IllegalStateException("Finish or discard the pending battery test before running performance tests.");
        String id = runId(); File run = new File(storage, id); run.mkdirs();
        JSONObject metadata = new JSONObject(setup.toString());
        try {
            connect(endpoint); prepare();
            progress.accept("Reading watch and face information…");
            capture("probe", id, "", run);
            collectInfo(metadata);
            JSONObject settings = new JSONObject();
            for (String key : new String[]{"screen_brightness", "screen_brightness_mode", "screen_off_timeout"})
                settings.put(key, command("settings get system " + key).trim());
            for (String key : new String[]{"wifi_on", "bluetooth_on", "airplane_mode_on", "mobile_data"})
                settings.put(key, command("settings get global " + key).trim());
            metadata.put("watchSettings", settings);
            if (Measurements.number(settings.optString("screen_off_timeout")) == null || Double.parseDouble(settings.optString("screen_off_timeout")) < 35000)
                throw new IllegalStateException("Set the watch display timeout to one minute, then run the test again. The helper will not change it automatically.");
            progress.accept("Recording for 30 seconds. Keep the selected face visible on the watch; you can leave the phone alone.");
            command("input keyevent 224");
            capture("trace", id, "", run);
            progress.accept("Saving the trace to this phone…");
            File traceDir = new File(run, "trace"); traceDir.mkdirs();
            Files.write(new File(traceDir, "trace.perfetto-trace").toPath(), connection.file(remote(id, "trace/trace.perfetto-trace"), 16 * 1024 * 1024));
            save(metadata, new File(run, "run.json"));
            cleanup(id);
        } catch (Exception error) {
            save(metadata, new File(run, "run.json"));
            throw error;
        } finally { disconnect(); }
        progress.accept("Analyzing on the phone. The watch is disconnected; you can turn wireless debugging off.");
        String report = header("PERFORMANCE", id, metadata) + new TraceAnalysis(context, new File(run, "trace/trace.perfetto-trace"), run)
                .report(metadata.optString("rendererProcess"), metadata.optString("rendererLayer"))
                + "\nMatch brightness, timeout, connectivity, wrist movement and visible time across repeats.\n"
                + "This report does not measure exclusive watch-face power.\n";
        return finish(report, run);
    }

    /** Save the start endpoint, then disconnect; nothing polls the watch during normal wear. */
    public void startBattery(LocalEndpoint endpoint, JSONObject setup) throws Exception {
        if (batteryPending()) throw new IllegalStateException("A battery test is already pending.");
        String id = runId(); File run = new File(storage, id); run.mkdirs();
        JSONObject metadata = new JSONObject(setup.toString());
        try {
            connect(endpoint); prepare(); collectInfo(metadata);
            progress.accept("Saving the battery start snapshot…");
            capture("snapshot", id, "start", run);
            downloadEndpoint(id, "start", run);
            save(metadata, new File(run, "run.json"));
            save(new JSONObject().put("id", id), pendingFile);
            cleanup(id);
        } finally { disconnect(); }
    }

    /** Finish the saved run with its original declared configuration, even after app restart. */
    public String finishBattery(LocalEndpoint endpoint) throws Exception {
        if (!batteryPending()) throw new IllegalStateException("Start a battery test first.");
        String id = new JSONObject(readText(pendingFile)).getString("id");
        if (!id.matches("phone_[a-zA-Z0-9_]+")) throw new IOException("Saved test ID is invalid.");
        File run = new File(storage, id);
        JSONObject metadata = new JSONObject(readText(new File(run, "run.json")));
        try {
            connect(endpoint); prepare();
            progress.accept("Saving the battery end snapshot…");
            capture("snapshot", id, "end", run);
            downloadEndpoint(id, "end", run);
            cleanup(id);
        } finally { disconnect(); }
        Measurements.Snapshot a = endpoint(new File(run, "start")), b = endpoint(new File(run, "end"));
        Measurements.Battery result = Measurements.compare(a, b);
        if (metadata.optBoolean("aod")) result.flags.add("aod-enabled-outside-baseline");
        String report = header("BATTERY", id, metadata) + endpointSettings(a)
                + "BATTERY — WHOLE WATCH\n"
                + "Duration: " + Measurements.metric(result.hours, "hours") + "\n"
                + "Start / end: " + Measurements.metric(a.percent(), "%") + " / " + Measurements.metric(b.percent(), "%") + "\n"
                + "Observed loss: " + Measurements.metric(result.loss, "percentage points") + "\n"
                + "Observed drain: " + Measurements.metric(result.pointsPerHour, "percentage points/hour") + "\n"
                + "Charge-counter decrease: " + Measurements.metric(result.chargeLoss, "µAh") + "\n"
                + "Android modeled use: " + Measurements.metric(result.estimatedMah, "mAh (estimate)") + "\n"
                + "Qualification: " + (result.qualified() ? "no detected contamination; review normal-use differences" : "requires review / repeat") + "\n"
                + "Flags: " + (result.flags.isEmpty() ? "none" : String.join(", ", result.flags)) + "\n\n"
                + "Battery drain covers the whole watch. Compare with a stock face under matched conditions.\n"
                + "No continuous logger ran during this interval. Charging and history checks depend on device support.\n";
        String completed = finish(report, run);
        Files.delete(pendingFile.toPath());
        return completed;
    }

    /** Reanalyze an existing trace after selecting its exact renderer process or surface, without reconnecting. */
    public String reanalyze(String process, String layer) throws Exception {
        File[] runs = storage.listFiles(file -> file.isDirectory() && new File(file, "trace/trace.perfetto-trace").isFile());
        if (runs == null || runs.length == 0) throw new IllegalStateException("Run a performance test first.");
        java.util.Arrays.sort(runs, java.util.Comparator.comparing(File::getName).reversed());
        File run = runs[0]; JSONObject metadata = new JSONObject(readText(new File(run, "run.json")));
        metadata.put("rendererProcess", process.trim()).put("rendererLayer", layer.trim());
        save(metadata, new File(run, "run.json"));
        String report = header("PERFORMANCE", run.getName(), metadata) + new TraceAnalysis(context, new File(run, "trace/trace.perfetto-trace"), run).report(process.trim(), layer.trim());
        return finish(report, run);
    }

    /** Explicitly discard an unfinished run without connecting or changing the watch. */
    public void discardBattery() throws IOException { Files.deleteIfExists(pendingFile.toPath()); }

    /** Delete local reports/captures only. Pairing identity is retained to avoid unnecessary re-pairing. */
    public void clearReports() throws IOException {
        if (batteryPending()) throw new IllegalStateException("Finish or discard the pending battery test first.");
        File[] files = storage.listFiles();
        if (files != null) for (File file : files) delete(file);
    }

    /** Stop the transport if an operation is cancelled or the owning activity is destroyed. */
    public void disconnect() { WatchConnection active = connection; connection = null; if (active != null) active.stop(); }

    private void connect(LocalEndpoint endpoint) throws Exception {
        progress.accept("Connecting to the watch…");
        connection = new WatchConnection(context); connection.connectWatch(endpoint);
    }
    private String command(String command) throws Exception { return connection.command(command, 30); }
    private void prepare() throws Exception {
        try (var input = context.getAssets().open("capture.sh")) {
            String data = Base64.encodeToString(input.readAllBytes(), Base64.NO_WRAP);
            command("printf %s " + WatchConnection.quote(data) + " | base64 -d > " + COLLECTOR);
        }
    }
    private void capture(String action, String id, String extra, File run) throws Exception {
        String output = connection.command("sh " + COLLECTOR + " " + action + " " + id + (extra.isEmpty() ? "" : " " + extra), action.equals("trace") ? 60 : 150);
        writeText(new File(run, action + (extra.isEmpty() ? "" : "-" + extra) + ".log"), output);
    }
    private void downloadEndpoint(String id, String side, File run) throws Exception {
        File directory = new File(run, side); directory.mkdirs();
        for (String name : SNAPSHOT_FILES) {
            String file = name.equals("status") ? "status.tsv" : name + ".txt";
            Files.write(new File(directory, file).toPath(), connection.file(remote(id, side + "/" + file), 8 * 1024 * 1024));
        }
    }
    private static String remote(String id, String path) { return "/data/local/tmp/real_time/" + id + "/" + path; }
    private void cleanup(String id) {
        // IDs are generated by this app, not user-entered paths. Remove only this run's temporary files.
        if (!id.matches("phone_[a-zA-Z0-9_]+")) return;
        try { command("rm -rf " + remote(id, "") + " /data/misc/perfetto-traces/real_time_" + id + ".perfetto-trace"); }
        catch (Exception ignored) { progress.accept("Report saved; temporary watch files could not be removed. Turn wireless debugging off after collection."); }
    }
    private void collectInfo(JSONObject metadata) throws Exception {
        metadata.put("watchModel", command("getprop ro.product.model").trim());
        metadata.put("firmware", command("getprop ro.build.fingerprint").trim());
        String facePackage = FaceCatalog.packageName(metadata.optString("face"));
        if (facePackage != null) {
            String packages = command("dumpsys package " + facePackage);
            var match = Pattern.compile("versionName=([^\\s]+)").matcher(packages);
            metadata.put("faceVersion", match.find() ? match.group(1) : "unavailable");
            // The first published face's source is known; later unknown versions remain explicitly unknown.
            metadata.put("faceCommit", FaceCatalog.commit(metadata.optString("face"), metadata.optString("faceVersion")));
        } else metadata.put("faceVersion", "unavailable / user-selected face").put("faceCommit", "unavailable");
    }
    private static Measurements.Snapshot endpoint(File directory) throws IOException {
        Map<String, String> values = new LinkedHashMap<>();
        for (String name : SNAPSHOT_FILES) {
            File file = new File(directory, name + ".txt");
            if (file.isFile()) values.put(name, readText(file));
        }
        return new Measurements.Snapshot(values);
    }
    private static String header(String kind, String id, JSONObject metadata) {
        StringBuilder report = new StringBuilder("REAL_TIME DIAGNOSTICS / 1\n");
        report.append("Helper: ").append(BuildConfig.VERSION_NAME).append(" / ").append(BuildConfig.SOURCE_COMMIT).append('\n');
        report.append("Test: ").append(kind).append(" / ").append(id).append('\n');
        for (String key : new String[]{"watchModel", "firmware", "face", "faceVersion", "faceCommit", "palette", "motionSpeed", "motionStyle", "preset", "aod"})
            report.append(key).append(": ").append(Measurements.clean(metadata.optString(key, "unavailable"))).append('\n');
        report.append("Setup is user-declared; verify it matches the watch editor.\n");
        JSONObject effects = metadata.optJSONObject("effects");
        if (effects != null) for (String key : FaceCatalog.reportEffects(metadata.optString("face"), metadata.optString("faceVersion"))) report.append(key).append('=').append(!effects.has(key) ? "unavailable " : effects.optBoolean(key) ? "on " : "off ");
        report.append("\n");
        JSONObject settings = metadata.optJSONObject("watchSettings");
        if (settings != null) for (String key : new String[]{"screen_brightness", "screen_brightness_mode", "screen_off_timeout", "wifi_on", "bluetooth_on", "airplane_mode_on", "mobile_data"})
            report.append(key).append(": ").append(Measurements.clean(settings.optString(key))).append('\n');
        return report.append("No automatic upload. Addresses, pairing keys and device IDs are omitted.\n\n").toString();
    }
    private static String endpointSettings(Measurements.Snapshot point) {
        StringBuilder out = new StringBuilder("WATCH SETTINGS AT START\n");
        for (String key : new String[]{"brightness", "brightness-mode", "timeout", "aod", "wifi", "bluetooth", "airplane"})
            out.append(key).append(": ").append(Measurements.clean(point.text(key))).append('\n');
        return out.append('\n').toString();
    }
    private String finish(String report, File run) throws IOException {
        writeText(new File(run, "report.txt"), report);
        writeText(reportFile, report);
        return report;
    }
    private static void save(JSONObject object, File file) throws IOException {
        File temporary = new File(file.getParentFile(), file.getName() + ".tmp");
        writeText(temporary, object.toString());
        Files.move(temporary.toPath(), file.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }
    private static String runId() { return "phone_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.ROOT).format(new Date()) + "_" + java.util.UUID.randomUUID().toString().substring(0, 8); }
    private static String readText(File file) throws IOException { return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8); }
    private static void writeText(File file, String text) throws IOException { Files.write(file.toPath(), text.getBytes(StandardCharsets.UTF_8)); }
    private static void delete(File file) throws IOException {
        File[] children = file.listFiles(); if (children != null) for (File child : children) delete(child);
        Files.deleteIfExists(file.toPath());
    }
}
