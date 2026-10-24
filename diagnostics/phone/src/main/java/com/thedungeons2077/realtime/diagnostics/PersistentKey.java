/** Identity layer: one persistent app identity outlives any individual ADB connection. */
package com.thedungeons2077.realtime.diagnostics;

import java.math.BigInteger;
import java.security.interfaces.RSAPrivateKey;

/** Prevent a per-connection cleanup from invalidating libadb's cached TLS identity. */
public final class PersistentKey implements RSAPrivateKey {
    private static final long serialVersionUID = 1L;
    private final RSAPrivateKey delegate;

    /** Wrap a private app identity, which is never exported through diagnostics. */
    public PersistentKey(RSAPrivateKey key) { delegate = key; }
    /** Provide standard RSA metadata to the cryptographic provider. */
    @Override public BigInteger getPrivateExponent() { return delegate.getPrivateExponent(); }
    /** Provide the modulus used for ADB authentication. */
    @Override public BigInteger getModulus() { return delegate.getModulus(); }
    /** This identity uses RSA as required by ADB. */
    @Override public String getAlgorithm() { return delegate.getAlgorithm(); }
    /** Encoding is used only by private persistence and the TLS provider. */
    @Override public String getFormat() { return delegate.getFormat(); }
    /** Return the provider's standard PKCS8 encoding. */
    @Override public byte[] getEncoded() { return delegate.getEncoded(); }
    /** ADB close must not destroy a process-cached identity needed for subsequent connections. */
    @Override public void destroy() { /* App data removal and watch unpairing revoke the persistent identity. */ }
    /** The identity remains usable across test connections in this process. */
    @Override public boolean isDestroyed() { return false; }
}
