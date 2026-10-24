/** Reconnection contract: libadb cleanup must not break the next paired TLS authentication. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import static org.junit.Assert.*;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.interfaces.RSAPrivateKey;

/** Use the JVM's actual RSA provider rather than mocking identity lifetime. */
public final class PersistentKeyTest {
    /** The same key can authenticate after one connection closes and requests destruction. */
    @Test public void connectionCleanupKeepsIdentityUsable() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        var pair = generator.generateKeyPair();
        var key = new PersistentKey((RSAPrivateKey) pair.getPrivate());
        key.destroy();
        var signature = Signature.getInstance("SHA256withRSA"); signature.initSign(key); signature.update(new byte[]{1, 2, 3}); byte[] signed = signature.sign();
        signature.initVerify(pair.getPublic()); signature.update(new byte[]{1, 2, 3});
        assertTrue(signature.verify(signed)); assertFalse(key.isDestroyed()); assertArrayEquals(pair.getPrivate().getEncoded(), key.getEncoded());
    }
}
