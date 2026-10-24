/** Installation protocol: bounded APK streaming and strict package-manager result checks. */
package com.thedungeons2077.realtime.diagnostics;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.function.IntConsumer;
import java.util.regex.Pattern;

/** Pure protocol rules shared by the ADB transport and its tests. */
public final class InstallProtocol {
    /** Resource-only faces are small; bound provider reads and transfer size. */
    public static final long MAX_APK_BYTES = 32L * 1024 * 1024;
    private InstallProtocol() { }

    /** Use Android's streamed install, replacing a compatible package while preserving its data. */
    public static String service(long size) {
        if (size <= 0 || size > MAX_APK_BYTES) throw new IllegalArgumentException("Choose a watch-face APK no larger than 32 MiB.");
        return "exec:cmd package install -r -S " + size;
    }

    /** Send exactly the inspected file, without buffering the whole APK or closing the response stream. */
    public static void copy(InputStream source, OutputStream target, long size, IntConsumer progress) throws IOException {
        service(size);
        byte[] buffer = new byte[32768]; long sent = 0; int last = -1;
        while (sent < size) {
            if (Thread.currentThread().isInterrupted()) throw new IOException("Installation interrupted; check the watch before retrying.");
            int count = source.read(buffer, 0, (int) Math.min(buffer.length, size - sent));
            if (count < 0) throw new IOException("The selected APK was truncated.");
            if (count == 0) continue;
            target.write(buffer, 0, count); sent += count;
            int percent = (int) (sent * 100 / size);
            if (percent / 10 != last / 10 || percent == 100) { last = percent; progress.accept(percent); }
        }
        if (source.read() != -1) throw new IOException("The selected APK changed size.");
        target.flush();
    }

    /** A completed transfer is not an installation; require the watch's explicit Success response. */
    public static void requireSuccess(String response) throws IOException {
        if (!response.trim().equals("Success"))
            throw new IOException("Watch installation result: " + Measurements.clean(response));
    }

    /** Confirm that the requested version is registered after the watch reports success. */
    public static void requireVersion(String packageDump, long version) throws IOException {
        var match = Pattern.compile("(?m)^\\s*versionCode=(\\d+)\\b").matcher(packageDump);
        if (!match.find() || !match.group(1).equals(Long.toString(version)))
            throw new IOException("Installation was reported successful, but its version could not be verified. Check the watch face list before retrying.");
    }
}
