/** Archive inspection never extracts or executes a selected file. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import java.io.IOException;
import java.nio.file.Files;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import static org.junit.Assert.*;

public final class FaceApkTest {
    private void inspect(String... names) throws Exception {
        var file = Files.createTempFile("face-apk-test", ".apk");
        try {
            try (var zip = new ZipOutputStream(Files.newOutputStream(file))) {
                for (String name : names) { zip.putNextEntry(new ZipEntry(name)); zip.write(new byte[]{1}); zip.closeEntry(); }
            }
            FaceApk.inspectContents(file.toFile());
        } finally { Files.delete(file); }
    }
    @Test public void resourceOnlyWatchFacePasses() throws Exception { inspect("AndroidManifest.xml", "res/raw/watchface.xml", "res/drawable/preview.webp"); }
    @Test public void missingFaceAndExecutableContentFail() {
        assertThrows(IOException.class, () -> inspect("AndroidManifest.xml"));
        assertThrows(IOException.class, () -> inspect("res/raw/watchface.xml", "classes2.dex"));
        assertThrows(IOException.class, () -> inspect("res/raw/watchface.xml", "lib/arm64-v8a/code.so"));
    }
}
