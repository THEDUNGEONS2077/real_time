/** Archive inspection never extracts or executes a selected file. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import java.io.IOException;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.zip.ZipFile;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import static org.junit.Assert.*;

public final class FaceApkTest {
    private void inspect(String watchfacePath, String... names) throws Exception {
        var file = Files.createTempFile("face-apk-test", ".apk");
        try {
            try (var zip = new ZipOutputStream(Files.newOutputStream(file))) {
                for (String name : names) { zip.putNextEntry(new ZipEntry(name)); zip.write(new byte[]{1}); zip.closeEntry(); }
            }
            FaceApk.inspectContents(file.toFile(), watchfacePath);
        } finally { Files.delete(file); }
    }
    @Test public void resourceOnlyWatchFacePasses() throws Exception { inspect("res/raw/watchface.xml", "AndroidManifest.xml", "res/raw/watchface.xml", "res/drawable/preview.webp"); }
    @Test public void optimizedPathPassesWithoutSourcePath() throws Exception { inspect("res/li.xml", "AndroidManifest.xml", "res/li.xml", "resources.arsc"); }
    @Test public void missingFaceAndExecutableContentFail() {
        assertThrows(IOException.class, () -> inspect("res/raw/watchface.xml", "AndroidManifest.xml"));
        assertThrows(IOException.class, () -> inspect("res/li.xml", "res/li.xml", "classes2.dex"));
        assertThrows(IOException.class, () -> inspect("res/li.xml", "res/li.xml", "lib/arm64-v8a/code.so"));
        assertThrows(IOException.class, () -> inspect(null, "res/li.xml"));
        assertThrows(IOException.class, () -> inspect("../res/li.xml", "res/li.xml"));
    }
    @Test public void actualPackagedHaloResolvesItsWatchfaceResource() throws Exception {
        inspectPackaged(new File(System.getProperty("halo.selection.fixture")));
    }
    @Test public void actualPackagedRedlineResolvesItsWatchfaceResource() throws Exception {
        inspectPackaged(new File(System.getProperty("redline.selection.fixture")));
    }
    @Test public void actualPackagedNexusResolvesItsWatchfaceResource() throws Exception {
        inspectPackaged(new File(System.getProperty("nexus.selection.fixture")));
    }
    @Test public void actualPackagedJarvisResolvesItsWatchfaceResource() throws Exception {
        inspectPackaged(new File(System.getProperty("jarvis.selection.fixture")));
    }
    private void inspectPackaged(File apk) throws Exception {
        assertTrue("A packaged face fixture is required", apk.isFile());
        // AAPT2 is a trusted SDK tool reading our built APK, never code from a diagnostic export.
        File output = File.createTempFile("halo-resource-table-", ".txt");
        Process process = new ProcessBuilder(System.getProperty("halo.selection.aapt2"), "dump", "resources", apk.getAbsolutePath())
                .redirectErrorStream(true).redirectOutput(output).start();
        try {
            assertTrue("Resource inspection timed out", process.waitFor(20, TimeUnit.SECONDS));
            assertEquals(0, process.exitValue());
            String table = new String(Files.readAllBytes(output.toPath()), StandardCharsets.UTF_8);
            var resource = Pattern.compile("resource 0x[0-9a-fA-F]+ raw/watchface\\s+\\(\\) \\(file\\) ([^\\s]+)").matcher(table);
            assertTrue("raw/watchface must resolve through the APK resource table", resource.find());
            String path = resource.group(1);
            try (ZipFile zip = new ZipFile(apk)) {
                assertNull("Regression fixture must exercise optimized packaging", zip.getEntry("res/raw/watchface.xml"));
                assertNotNull(zip.getEntry(path));
            }
            FaceApk.inspectContents(apk, path);
            assertThrows(IOException.class, () -> FaceApk.inspectContents(apk, "res/raw/watchface.xml"));
        } finally { if (process.isAlive()) process.destroyForcibly(); Files.deleteIfExists(output.toPath()); }
    }
}
