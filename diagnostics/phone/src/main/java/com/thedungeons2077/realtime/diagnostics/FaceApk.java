/** APK selection: copy a user-selected document privately and inspect it before any watch connection. */
package com.thedungeons2077.realtime.diagnostics;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.zip.ZipFile;

/** An immutable selection; installation uses this private copy rather than reopening a document provider. */
public final class FaceApk implements AutoCloseable {
    /** Private staged file, package/version identity and its content fingerprint. */
    public final File file;
    public final String packageName, versionName, sha256;
    public final long versionCode, size;
    public final int minSdk;

    private FaceApk(File source, String name, String version, long code, int sdk, String hash) {
        file = source; packageName = name; versionName = version; versionCode = code; minSdk = sdk;
        size = file.length(); sha256 = hash;
    }

    /** Read only the document granted by Android's picker; no broad storage permission or URI persistence. */
    public static FaceApk select(Context context, Uri document) throws Exception {
        File staged = File.createTempFile("watch-face-", ".apk", context.getCacheDir());
        try {
            MessageDigest hash = MessageDigest.getInstance("SHA-256"); long size = 0;
            try (InputStream input = context.getContentResolver().openInputStream(document);
                 var output = Files.newOutputStream(staged.toPath())) {
                if (input == null) throw new IOException("The selected file could not be opened.");
                byte[] buffer = new byte[32768]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (Thread.currentThread().isInterrupted()) throw new IOException("APK selection interrupted.");
                    size += count;
                    if (size > InstallProtocol.MAX_APK_BYTES) throw new IOException("Choose a watch-face APK no larger than 32 MiB.");
                    hash.update(buffer, 0, count); output.write(buffer, 0, count);
                }
            }
            InstallProtocol.service(size);
            var info = context.getPackageManager().getPackageArchiveInfo(staged.getAbsolutePath(),
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES | PackageManager.GET_PERMISSIONS | PackageManager.GET_CONFIGURATIONS));
            if (info == null || info.applicationInfo == null || info.signingInfo == null)
                throw new IOException("This file is not a readable signed APK. Choose the HALO watch-face APK.");
            if (!WatchInstallSession.PACKAGE.equals(info.packageName))
                throw new IOException("Choose the HALO watch-face APK. The phone helper and other apps cannot be installed here.");
            var signers = info.signingInfo.getApkContentsSigners();
            if (signers.length != 1 || !hex(MessageDigest.getInstance("SHA-256").digest(signers[0].toByteArray())).equals(BuildConfig.FACE_CERT_SHA256))
                throw new IOException("This APK does not have the real_time release signature.");
            if ((info.applicationInfo.flags & ApplicationInfo.FLAG_HAS_CODE) != 0 || (info.requestedPermissions != null && info.requestedPermissions.length != 0))
                throw new IOException("The selected face contains code or requests permissions.");
            boolean watch = false;
            if (info.reqFeatures != null) for (var feature : info.reqFeatures) watch |= "android.hardware.type.watch".equals(feature.name);
            if (!watch) throw new IOException("The selected APK is not a watch package.");
            inspectContents(staged);
            return new FaceApk(staged, info.packageName, Measurements.clean(info.versionName), info.getLongVersionCode(),
                    info.applicationInfo.minSdkVersion, hex(hash.digest()));
        } catch (Exception failure) { Files.deleteIfExists(staged.toPath()); throw failure; }
    }

    /** Check the resource-only footprint without extracting or executing APK contents. */
    static void inspectContents(File file) throws IOException {
        try (ZipFile zip = new ZipFile(file)) {
            if (zip.getEntry("res/raw/watchface.xml") == null) throw new IOException("The APK does not contain a WFF watch face.");
            var entries = zip.entries(); int count = 0;
            while (entries.hasMoreElements()) {
                String name = entries.nextElement().getName();
                if (++count > 10000 || name.endsWith(".dex") || name.endsWith(".so") || name.startsWith("lib/"))
                    throw new IOException("The selected face has an unsupported APK footprint.");
            }
        }
    }

    /** Short local selection details shown before the explicit install action. */
    public String summary() { return "HALO " + versionName + " (build " + versionCode + ")\n" + packageName + "\n" + size + " bytes\nSHA-256: " + sha256; }
    /** Verify the private selection again before starting a watch transfer. */
    public void verifyUnchanged() throws Exception {
        MessageDigest hash = MessageDigest.getInstance("SHA-256");
        try (var input = Files.newInputStream(file.toPath())) {
            byte[] buffer = new byte[32768]; int count;
            while ((count = input.read(buffer)) != -1) hash.update(buffer, 0, count);
        }
        if (file.length() != size || !hex(hash.digest()).equals(sha256)) throw new IOException("The selected APK changed. Choose it again.");
    }
    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(); for (byte value : bytes) out.append(String.format(java.util.Locale.ROOT, "%02x", value & 255)); return out.toString();
    }
    /** Remove the private temporary selection when replaced or the screen closes. */
    @Override public void close() { file.delete(); }
}
