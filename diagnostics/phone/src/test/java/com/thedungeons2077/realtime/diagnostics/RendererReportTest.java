/** Representative logcat exports, including colour fallback, crashed processes and missing sources. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import static org.junit.Assert.*;

public final class RendererReportTest {
    private static final String PROCESSES = "PID NAME\n1234 com.google.wear.watchface.runtime\n777 com.example.other\n";
    @Test public void relevantThemeWarningsSurviveWithoutOtherAppMessages() {
        String logs = "W/DwfRenderer( 1234): Cannot parse theme color. Using theme color WHITE\n"
                + "E/SomeOtherApp( 777): private calendar text\nI/DwfRenderer( 1234): routine animation\n";
        String out = RendererReport.summarize(PROCESSES, logs, "", "renderer-main\tok\n");
        assertTrue(out.contains("Using theme color WHITE")); assertFalse(out.contains("calendar"));
        assertFalse(out.contains("routine animation")); assertFalse(out.contains("1234"));
    }
    @Test public void crashedRuntimeIsAttributedEvenWhenItHasExited() {
        String crash = "E/AndroidRuntime( 5678): FATAL EXCEPTION: main\n"
                + "E/AndroidRuntime( 5678): Process: com.google.wear.watchface.runtime, PID: 5678\n"
                + "E/AndroidRuntime( 5678): android.content.res.Resources$NotFoundException: Resource ID #0x0\n"
                + "E/AndroidRuntime( 5678):     at renderer.open(Resource.java:42)\n";
        String out = RendererReport.summarize("PID NAME", "", crash, "renderer-crash\tok\n");
        assertTrue(out.contains("FATAL EXCEPTION")); assertTrue(out.contains("Resource ID #0x0"));
        assertTrue(out.contains("Resource.java:42")); assertFalse(out.contains("5678"));
    }
    @Test public void noMatchingRecordsDoNotBecomeAClaimOfSuccessfulRendering() {
        String out = RendererReport.summarize("", "E/Other( 77): unrelated", "", "");
        assertTrue(out.contains("not identified")); assertTrue(out.contains("does not prove"));
        assertFalse(out.contains("unrelated"));
    }
    @Test public void failedSourcesStayExplicit() {
        String out = RendererReport.summarize("", "permission denied", "", "renderer-main\tfailed:1\n");
        assertTrue(out.contains("collection commands failed")); assertTrue(out.contains("unavailable"));
    }
    @Test public void addressesIdentifiersAndSensitiveFieldsAreNotCopied() {
        String logs = "W/DwfRenderer( 1234): endpoint 192.168.1.2 owner@example.com 00112233-4455-6677-8899-aabbccddeeff aa:bb:cc:dd:ee:ff\n"
                + "E/DwfRenderer( 1234): token=very-private-value\n";
        String out = RendererReport.summarize(PROCESSES, logs, "", "");
        assertFalse(out.contains("192.168.1.2")); assertFalse(out.contains("owner@example.com"));
        assertFalse(out.contains("00112233-4455")); assertFalse(out.contains("aa:bb:cc:dd:ee:ff"));
        assertFalse(out.contains("very-private-value"));
    }
    @Test public void duplicateWarningsAndOutputSizeAreBounded() {
        StringBuilder logs = new StringBuilder();
        for (int i = 0; i < 120; i++) logs.append("W/DwfRenderer( 1234): warning ").append(i).append('\n');
        logs.append("W/DwfRenderer( 1234): warning 119\n");
        String out = RendererReport.summarize(PROCESSES, logs.toString(), "", "");
        assertFalse(out.contains("W/DwfRenderer: warning 0\n"));
        assertEquals(1, out.split("W/DwfRenderer: warning 119", -1).length - 1);
        assertEquals(80, out.split("W/DwfRenderer: warning", -1).length - 1);
    }
    @Test public void unknownAttributionStillAcceptsSpecificDwfTags() {
        String out = RendererReport.summarize("", "E/DwfDocumentParser( 9): failed at line 57", "", "");
        assertTrue(out.contains("failed at line 57")); assertFalse(out.contains("( 9)"));
    }
}
