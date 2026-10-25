/**
 * Application layer: pair with the watch and install a checked face APK on it.
 *
 * Every action connects, does its work and disconnects; nothing runs in the background.
 * Failures are kept as one copyable summary (no addresses, codes or device IDs).
 */
package com.thedungeons2077.realtime.diagnostics;

import android.content.Context;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.function.Consumer;
import java.util.function.IntConsumer;

public final class Installer {
    private final Context context;
    private final Consumer<String> status;
    private final File errorFile;
    private volatile WatchConnection connection;

    /** `status` receives short progress messages for the screen. */
    public Installer(Context appContext, Consumer<String> status) {
        context = appContext.getApplicationContext();
        this.status = status;
        errorFile = new File(context.getNoBackupFilesDir(), "last-error.txt");
        // Earlier helper versions kept test captures here; the installer no longer collects any.
        delete(new File(context.getNoBackupFilesDir(), "diagnostics"));
    }

    /** Pair this phone with the watch once. The pairing code is used and forgotten. */
    public void pair(LocalEndpoint endpoint, String code) throws Exception {
        status.accept("Pairing with the watch…");
        try { connection = new WatchConnection(context); connection.pairWatch(endpoint, code); }
        finally { disconnect(); }
    }

    /** Check the saved pairing reaches a watch. Returns its model name. */
    public String checkConnection(LocalEndpoint endpoint) throws Exception {
        try {
            connect(endpoint);
            WatchInstallSession.watchApi(connection);
            return Text.clean(connection.command("getprop ro.product.model", 30));
        } finally { disconnect(); }
    }

    /**
     * Stream the checked APK to the watch's package manager and verify the installed version.
     * `percent` receives 0–100 while the file is sent.
     */
    public void install(LocalEndpoint endpoint, FaceApk apk, IntConsumer percent) throws Exception {
        apk.verifyUnchanged();
        try {
            connect(endpoint);
            status.accept("Checking the watch…");
            WatchInstallSession.install(connection, apk.file, apk.packageName, apk.size, apk.minSdk, apk.versionCode, sent -> {
                percent.accept(sent);
                status.accept(sent < 100 ? "Sending " + FaceCatalog.name(apk.packageName) + " to the watch…" : "Installing on the watch…");
            });
        } finally { disconnect(); }
    }

    /** Turn a failure into a copyable summary and keep it until the next failure. */
    public String recordFailure(String action, Throwable error) {
        String report = "REAL_TIME INSTALLER / " + action.toUpperCase(java.util.Locale.ROOT)
                + "\nInstaller: " + BuildConfig.VERSION_NAME + " / " + BuildConfig.SOURCE_COMMIT
                + "\nTime (UTC): " + java.time.Instant.now() + "\n\n" + OperationFailure.describe(action, error) + "\n";
        try { Files.write(errorFile.toPath(), report.getBytes(StandardCharsets.UTF_8)); } catch (IOException ignored) { }
        return report;
    }

    /** The last saved failure summary, or an empty string. */
    public String lastError() {
        try { return errorFile.isFile() ? new String(Files.readAllBytes(errorFile.toPath()), StandardCharsets.UTF_8) : ""; }
        catch (IOException error) { return ""; }
    }

    /** Close the connection; used by CANCEL and when the screen closes. */
    public void disconnect() { WatchConnection active = connection; connection = null; if (active != null) active.stop(); }

    private void connect(LocalEndpoint endpoint) throws Exception {
        status.accept("Connecting to the watch…");
        connection = new WatchConnection(context);
        connection.connectWatch(endpoint);
    }

    private static void delete(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) delete(child);
        file.delete();
    }
}
