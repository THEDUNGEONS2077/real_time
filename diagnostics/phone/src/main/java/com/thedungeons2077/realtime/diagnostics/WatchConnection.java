/** Transport layer: paired local ADB, private persistent identity and bounded command/file reads. */
package com.thedungeons2077.realtime.diagnostics;

import android.content.Context;
import io.github.muntashirakon.adb.AbsAdbConnectionManager;
import io.github.muntashirakon.adb.AdbStream;
import io.github.muntashirakon.adb.AdbConnection;
import io.github.muntashirakon.adb.TimedPairing;
import org.conscrypt.Conscrypt;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Date;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** One on-demand connection. No service, discovery, background polling or remote server. */
public final class WatchConnection extends AbsAdbConnectionManager {
    private final PrivateKey privateKey;
    private final Certificate certificate;
    private final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor();
    private volatile AdbConnection activeConnection;
    private volatile TimedPairing activePairing;

    /** Load an identity from this phone's non-backed-up app storage or generate it once. */
    public WatchConnection(Context context) throws Exception {
        Security.insertProviderAt(Conscrypt.newProvider(), 1);
        var keyFile = new java.io.File(context.getNoBackupFilesDir(), "adb-key.pk8");
        var certFile = new java.io.File(context.getNoBackupFilesDir(), "adb-cert.der");
        if (keyFile.isFile() && certFile.isFile()) {
            privateKey = new PersistentKey((java.security.interfaces.RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Files.readAllBytes(keyFile.toPath()))));
            try (InputStream input = Files.newInputStream(certFile.toPath())) {
                certificate = CertificateFactory.getInstance("X.509").generateCertificate(input);
            }
        } else {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048, new SecureRandom());
            var pair = generator.generateKeyPair();
            privateKey = new PersistentKey((java.security.interfaces.RSAPrivateKey) pair.getPrivate());
            X500Name name = new X500Name("CN=real_time diagnostics");
            var builder = new JcaX509v3CertificateBuilder(name, new BigInteger(128, new SecureRandom()),
                    new Date(System.currentTimeMillis() - 86400000L), new Date(System.currentTimeMillis() + 315360000000L), name, pair.getPublic());
            BouncyCastleProvider bc = new BouncyCastleProvider();
            certificate = new JcaX509CertificateConverter().setProvider(bc).getCertificate(builder.build(
                    new JcaContentSignerBuilder("SHA256withRSA").setProvider(bc).build(privateKey)));
            Files.write(keyFile.toPath(), privateKey.getEncoded());
            Files.write(certFile.toPath(), certificate.getEncoded());
        }
        setApi(36);
        setTimeout(15, TimeUnit.SECONDS);
        setThrowOnUnauthorised(true);
    }

    /** Supply the local identity only to ADB authentication. */
    @Override protected PrivateKey getPrivateKey() { return privateKey; }
    /** Supply the matching certificate for paired TLS. */
    @Override protected Certificate getCertificate() { return certificate; }
    /** A generic pairing label reveals no account or phone-owner identity. */
    @Override protected String getDeviceName() { return "real_time diagnostics"; }

    /** Pair using only an already validated local endpoint. */
    public void pairWatch(LocalEndpoint endpoint, String code) throws Exception {
        String validated = LocalEndpoint.pairingCode(code);
        try (TimedPairing pairing = new TimedPairing()) {
            activePairing = pairing;
            pairing.start(endpoint.host, endpoint.port, validated, privateKey, certificate);
        } finally { activePairing = null; }
    }

    /** Connect using the separate connection port from Wireless debugging. */
    public void connectWatch(LocalEndpoint endpoint) throws Exception {
        if (!connect(endpoint.host, endpoint.port) && !isConnected()) throw new IOException("Watch connection did not complete. Check the current connection port.");
        activeConnection = getAdbConnection();
    }

    /** Execute an application-owned command, preserving exit status and bounding its duration. */
    public String command(String command, int timeoutSeconds) throws Exception {
        String marker = "REAL_TIME_EXIT_" + java.util.UUID.randomUUID().toString().replace("-", "");
        byte[] bytes = read("exec:sh -c " + quote(command + "\nrt_status=$?; printf '\\n" + marker + "=%s\\n' \"$rt_status\""), timeoutSeconds, 8 * 1024 * 1024);
        String text = new String(bytes, StandardCharsets.UTF_8).replace("\r\n", "\n");
        int at = text.lastIndexOf("\n" + marker + "=");
        if (at < 0) throw new IOException("Watch command ended without a completion marker.");
        String status = text.substring(at + marker.length() + 2).trim();
        if (!status.equals("0")) throw new IOException("Watch command failed (" + status + "). " + text.substring(0, Math.min(at, 300)));
        return text.substring(0, at);
    }

    /** Read binary diagnostics without PTY newline conversion. Only internal capture paths are accepted. */
    public byte[] file(String path, int maxBytes) throws Exception {
        if (!path.matches("/data/local/tmp/real_time/[a-zA-Z0-9_-]+/[a-zA-Z0-9_./-]+") || path.contains(".."))
            throw new IllegalArgumentException("Invalid capture path.");
        return read("exec:cat " + quote(path), 30, maxBytes);
    }

    private byte[] read(String service, int timeoutSeconds, int maxBytes) throws Exception {
        AtomicBoolean expired = new AtomicBoolean();
        // Close the transport on deadline even if opening the stream itself blocks.
        var deadline = deadlines.schedule(() -> { expired.set(true); abort(); }, timeoutSeconds, TimeUnit.SECONDS);
        try (AdbStream stream = openStream(service); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            InputStream input = stream.openInputStream();
            byte[] buffer = new byte[32768];
            while (true) {
                int count;
                try { count = input.read(buffer); }
                catch (IOException error) {
                    if (!expired.get() && "Stream closed.".equals(error.getMessage())) break;
                    throw error;
                }
                if (count < 0) break;
                if (output.size() + count > maxBytes) throw new IOException("Watch response exceeds the diagnostic size limit.");
                output.write(buffer, 0, count);
            }
            if (expired.get()) throw new IOException("Watch operation timed out. Check connectivity and try again.");
            return output.toByteArray();
        } finally { deadline.cancel(false); }
    }

    /** Quote internal shell literals; user fields never become commands. */
    public static String quote(String input) { return "'" + input.replace("'", "'\"'\"'") + "'"; }

    /** Stop sockets and deadlines when a test ends or the phone activity closes. */
    public void stop() {
        abort();
        deadlines.shutdownNow();
    }

    private void abort() {
        TimedPairing pairing = activePairing;
        if (pairing != null) try { pairing.close(); } catch (IOException ignored) { }
        // AbsAdbConnectionManager holds its lock while opening streams; close the socket directly.
        AdbConnection connection = activeConnection;
        if (connection != null) try { connection.close(); } catch (IOException ignored) { }
    }
}
