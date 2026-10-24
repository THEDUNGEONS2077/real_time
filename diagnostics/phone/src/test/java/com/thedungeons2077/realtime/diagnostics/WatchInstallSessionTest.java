/** Exercise the actual installation workflow with a deterministic watch transport. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.function.IntConsumer;
import static org.junit.Assert.*;

public final class WatchInstallSessionTest {
    private static final class Watch implements WatchInstallSession.Transport {
        String features = "feature:android.hardware.type.watch\n", api = "36\n", result = "Success\n", version = "versionCode=1 minSdk=36";
        final List<String> actions = new ArrayList<>();
        public String command(String command, int timeout) {
            actions.add(command);
            switch (command) {
                case "pm list features": return features;
                case "getprop ro.build.version.sdk": return api;
                case "dumpsys package com.thedungeons2077.realtime.halo": return version;
                case "dumpsys package com.thedungeons2077.realtime.redline": return version;
                default: throw new AssertionError("Unexpected watch command: " + command);
            }
        }
        public String streamApk(File file, long size, IntConsumer progress) { actions.add("stream"); progress.accept(100); return result; }
        void install() throws Exception { WatchInstallSession.install(this, new File("private.apk"), 100, 36, 1, p -> { }); }
    }
    @Test public void successChecksWatchBeforeTransferAndVersionAfterwards() throws Exception {
        Watch watch = new Watch(); watch.install();
        assertEquals(List.of("pm list features", "getprop ro.build.version.sdk", "stream", "dumpsys package com.thedungeons2077.realtime.halo"), watch.actions);
    }
    @Test public void olderWatchNeverReceivesTheApk() {
        Watch watch = new Watch(); watch.api = "35";
        assertThrows(IOException.class, watch::install); assertFalse(watch.actions.contains("stream"));
    }
    @Test public void phoneAndUnreadableVersionNeverReceiveTheApk() {
        Watch phone = new Watch(); phone.features = "feature:android.hardware.telephony\n";
        assertThrows(IOException.class, phone::install); assertFalse(phone.actions.contains("stream"));
        Watch unreadable = new Watch(); unreadable.api = "permission denied";
        assertThrows(IOException.class, unreadable::install); assertFalse(unreadable.actions.contains("stream"));
    }
    @Test public void failedInstallDoesNotRetryOrUninstall() {
        Watch watch = new Watch(); watch.result = "Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]";
        assertThrows(IOException.class, watch::install);
        assertEquals(List.of("pm list features", "getprop ro.build.version.sdk", "stream"), watch.actions);
    }
    @Test public void unverifiedInstallationIsNotAccepted() {
        Watch watch = new Watch(); watch.version = "Unable to find package";
        assertThrows(IOException.class, watch::install); assertEquals(4, watch.actions.size());
    }
    @Test public void redlineChecksItsOwnPackageAfterInstallation() throws Exception {
        Watch watch = new Watch();
        WatchInstallSession.install(watch, new File("redline.apk"), "com.thedungeons2077.realtime.redline", 100, 36, 1, p -> { });
        assertEquals("dumpsys package com.thedungeons2077.realtime.redline", watch.actions.get(watch.actions.size() - 1));
    }
    @Test public void unknownPackagesAreRejectedBeforeConnecting() {
        Watch watch = new Watch();
        assertThrows(IllegalArgumentException.class, () -> WatchInstallSession.install(watch, new File("other.apk"), "other; rm -rf /", 100, 36, 1, p -> { }));
        assertTrue(watch.actions.isEmpty());
    }
}
