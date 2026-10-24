/** Connection/installation failures remain useful after removing watch addresses. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import static org.junit.Assert.*;

public final class OperationFailureTest {
    @Test public void nestedTimeoutExplainsNetworkWithoutAddress() {
        String report = OperationFailure.describe("Connection", new IOException(new SocketTimeoutException("192.168.1.2 timed out")));
        assertTrue(report.contains("Stage: Connection")); assertTrue(report.contains("hotspot")); assertFalse(report.contains("192.168.1.2"));
        assertTrue(OperationFailure.describe("Pairing", new SocketTimeoutException("timed out")).contains("hotspot"));
    }
    @Test public void refusalAndSignatureConflictHaveDifferentActions() {
        assertTrue(OperationFailure.describe("Connection", new ConnectException("refused")).contains("current"));
        String report = OperationFailure.describe("Installation", new IOException("Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]"));
        assertTrue(report.contains("Nothing was uninstalled")); assertTrue(report.contains("check the watch face list"));
    }
    @Test public void pairingFailureRequestsFreshCodeWithoutLoggingIt() {
        String report = OperationFailure.describe("Pairing", new IOException("Pairing code was rejected."));
        assertTrue(report.contains("fresh pairing code")); assertFalse(report.contains("installation was interrupted"));
    }
}
