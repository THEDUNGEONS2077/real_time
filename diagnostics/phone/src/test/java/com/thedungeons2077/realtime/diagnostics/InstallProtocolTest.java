/** Stream and package-manager contracts: partial transfers never count as successful installs. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Random;
import static org.junit.Assert.*;

public final class InstallProtocolTest {
    @Test public void serviceUsesOnlyBoundedNumericLength() {
        assertEquals("exec:cmd package install -r -S 100", InstallProtocol.service(100));
        assertThrows(IllegalArgumentException.class, () -> InstallProtocol.service(0));
        assertThrows(IllegalArgumentException.class, () -> InstallProtocol.service(-1));
        assertThrows(IllegalArgumentException.class, () -> InstallProtocol.service(InstallProtocol.MAX_APK_BYTES + 1));
    }
    @Test public void binaryTransferSurvivesShortReadsAndChunkBoundaries() throws Exception {
        byte[] apk = new byte[131079]; new Random(2077).nextBytes(apk);
        var input = new ByteArrayInputStream(apk) {
            @Override public synchronized int read(byte[] buffer, int offset, int length) { return super.read(buffer, offset, Math.min(17, length)); }
        };
        var output = new ByteArrayOutputStream(); var progress = new ArrayList<Integer>();
        InstallProtocol.copy(input, output, apk.length, progress::add);
        assertArrayEquals(apk, output.toByteArray()); assertEquals(Integer.valueOf(100), progress.get(progress.size() - 1));
    }
    @Test public void truncatedAndGrowingInputsFail() {
        assertThrows(IOException.class, () -> InstallProtocol.copy(new ByteArrayInputStream(new byte[2]), new ByteArrayOutputStream(), 3, p -> { }));
        assertThrows(IOException.class, () -> InstallProtocol.copy(new ByteArrayInputStream(new byte[4]), new ByteArrayOutputStream(), 3, p -> { }));
    }
    @Test public void interruptedTransferFailsBeforeSending() {
        var output = new ByteArrayOutputStream(); Thread.currentThread().interrupt();
        try {
            assertThrows(IOException.class, () -> InstallProtocol.copy(new ByteArrayInputStream(new byte[3]), output, 3, p -> { }));
            assertEquals(0, output.size());
        } finally { Thread.interrupted(); }
    }
    @Test public void onlyExplicitSuccessIsAccepted() throws Exception {
        InstallProtocol.requireSuccess("Success\r\n");
        for (String response : new String[]{"", "Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]", "Success\nFailure", "Success: transfer"})
            assertThrows(IOException.class, () -> InstallProtocol.requireSuccess(response));
    }
    @Test public void installedVersionMustMatch() throws Exception {
        InstallProtocol.requireVersion("    versionCode=2 minSdk=36 targetSdk=36\n", 2);
        assertThrows(IOException.class, () -> InstallProtocol.requireVersion("versionCode=20 minSdk=36", 2));
        assertThrows(IOException.class, () -> InstallProtocol.requireVersion("Unable to find package", 2));
    }
}
