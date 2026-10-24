/** Pairing transport: bounded Android ADB v1 PAKE exchanges using libadb's existing cryptography.
 * Protocol reference: libadb-android 3.1.1 PairingConnectionCtx, Apache-2.0 license option,
 * and AOSP packages/modules/adb/pairing_connection. This adapter owns timeouts and cancellation.
 */
package io.github.muntashirakon.adb;

import org.conscrypt.Conscrypt;
import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.interfaces.RSAPublicKey;
import java.util.Arrays;
import javax.net.ssl.SSLSocket;

/** Same-package adapter uses the pinned library's PAKE primitives without reflection or hidden APIs. */
public final class TimedPairing implements Closeable {
    private final Socket raw = new Socket();

    /** Pair only a caller-validated endpoint; read/connect timeouts also bound stale pairing codes. */
    public void start(String host, int port, String code, PrivateKey key, Certificate certificate) throws Exception {
        raw.connect(new InetSocketAddress(host, port), 15000);
        raw.setSoTimeout(15000);
        raw.setTcpNoDelay(true);
        var context = SslUtils.getSslContext(new KeyPair(key, certificate));
        try (SSLSocket tls = (SSLSocket) context.getSocketFactory().createSocket(raw, host, port, true)) {
            tls.setSoTimeout(15000);
            tls.startHandshake();
            byte[] binding = Conscrypt.exportKeyingMaterial(tls, "adb-label\0", null, 64);
            byte[] digits = code.getBytes(StandardCharsets.US_ASCII);
            byte[] password = Arrays.copyOf(digits, digits.length + binding.length);
            System.arraycopy(binding, 0, password, digits.length, binding.length);
            PairingAuthCtx auth = PairingAuthCtx.createAlice(password);
            Arrays.fill(password, (byte) 0); Arrays.fill(digits, (byte) 0); Arrays.fill(binding, (byte) 0);
            if (auth == null) throw new IOException("Pairing cryptography could not start.");
            try {
                DataInputStream input = new DataInputStream(tls.getInputStream());
                DataOutputStream output = new DataOutputStream(tls.getOutputStream());
                send(output, 0, auth.getMsg());
                if (!auth.initCipher(receive(input, 0))) throw new IOException("Pairing code was rejected. Request a new code on the watch.");
                byte[] peer = new byte[8192];
                byte[] publicKey = AndroidPubkey.encodeWithName((RSAPublicKey) certificate.getPublicKey(), "real_time diagnostics");
                if (publicKey.length >= peer.length) throw new IOException("Pairing identity is too large.");
                System.arraycopy(publicKey, 0, peer, 1, publicKey.length);
                byte[] encrypted = auth.encrypt(peer);
                if (encrypted == null) throw new IOException("Pairing identity could not be encrypted.");
                send(output, 1, encrypted);
                byte[] remote = auth.decrypt(receive(input, 1));
                validatePeer(remote);
                Arrays.fill(remote, (byte) 0);
            } finally { auth.destroy(); }
        }
    }

    private static void send(DataOutputStream output, int type, byte[] payload) throws IOException {
        output.writeByte(1); output.writeByte(type); output.writeInt(payload.length); output.write(payload); output.flush();
    }
    /** ADB servers return a device GUID (type 1); type 0 is the client's RSA public key. */
    static void validatePeer(byte[] remote) throws IOException {
        if (remote == null || remote.length != 8192 || remote[0] != 1)
            throw new IOException("Watch pairing confirmation was invalid.");
    }
    private static byte[] receive(DataInputStream input, int expectedType) throws IOException {
        int version = input.readUnsignedByte(), type = input.readUnsignedByte(), size = input.readInt();
        if (version != 1 || type != expectedType || size <= 0 || size > 16384) throw new IOException("Unsupported pairing response.");
        byte[] bytes = new byte[size]; input.readFully(bytes); return bytes;
    }
    /** Closing the owned socket cancels both a TLS handshake and a pending read. */
    @Override public void close() throws IOException { raw.close(); }
}
