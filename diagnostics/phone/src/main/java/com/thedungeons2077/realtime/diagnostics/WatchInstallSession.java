/** Watch installation workflow, separated from Android UI and sockets for failure-path verification. */
package com.thedungeons2077.realtime.diagnostics;

import java.io.File;
import java.io.IOException;
import java.util.function.IntConsumer;

/** Installation never uninstalls a package, forces a downgrade or changes the selected watch face. */
public final class WatchInstallSession {
    /** Extend this explicit catalogue when another real_time face is released. */
    public static final String PACKAGE = "com.thedungeons2077.realtime.halo";
    private WatchInstallSession() { }

    /** Fixed application-owned commands and APK streaming, implemented by the paired ADB connection. */
    public interface Transport {
        String command(String command, int timeoutSeconds) throws Exception;
        String streamApk(File file, long size, IntConsumer progress) throws Exception;
    }

    /** Reject a phone or unsupported watch before sending the APK. */
    public static int watchApi(Transport transport) throws Exception {
        String features = transport.command("pm list features", 30);
        if (!features.lines().anyMatch(line -> line.trim().equals("feature:android.hardware.type.watch")))
            throw new IOException("The connected device is not identified as a watch. Nothing was installed.");
        String api = transport.command("getprop ro.build.version.sdk", 30).trim();
        if (!api.matches("[0-9]{1,3}")) throw new IOException("The watch's Android version could not be read.");
        return Integer.parseInt(api);
    }

    /** Require a supported watch, explicit package-manager success and a matching registered version. */
    public static void install(Transport transport, File file, long size, int minSdk, long versionCode, IntConsumer progress) throws Exception {
        InstallProtocol.service(size);
        if (watchApi(transport) < minSdk) throw new IOException("This APK requires Android API " + minSdk + ". Update the watch before installing it.");
        InstallProtocol.requireSuccess(transport.streamApk(file, size, progress));
        InstallProtocol.requireVersion(transport.command("dumpsys package " + PACKAGE, 30), versionCode);
    }
}
