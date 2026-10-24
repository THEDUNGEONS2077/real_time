/** Regression checks for the server peer-info format in Android's ADB pairing protocol. */
package io.github.muntashirakon.adb;

import java.io.IOException;
import org.junit.Test;
import static org.junit.Assert.assertThrows;

public final class TimedPairingTest {
    @Test public void serverReturnsDeviceGuidRatherThanClientPublicKey() throws Exception {
        byte[] guid = new byte[8192];
        guid[0] = 1;
        TimedPairing.validatePeer(guid);
        assertThrows(IOException.class, () -> TimedPairing.validatePeer(new byte[8192]));
        assertThrows(IOException.class, () -> TimedPairing.validatePeer(new byte[8191]));
        assertThrows(IOException.class, () -> TimedPairing.validatePeer(null));
    }
}
