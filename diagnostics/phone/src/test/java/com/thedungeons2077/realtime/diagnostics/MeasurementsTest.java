/** JVM contracts: real battery deltas, contamination and report redaction without an Android device. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.LinkedHashMap;
import java.util.Map;

/** Test inputs use Android's documented dumpsys/checkin field layout. */
public final class MeasurementsTest {
    private static Map<String, String> start() {
        Map<String, String> files = new LinkedHashMap<>();
        files.put("epoch", "100000"); files.put("uptime", "1000.0 1200.0");
        files.put("boot-id", "private-boot-identity"); files.put("firmware", "synthetic-watch-build");
        files.put("battery", "  AC powered: false\n  USB powered: false\n  Wireless powered: false\n  status: 3\n  level: 90\n  scale: 100\n  Charge counter: 270000\n");
        files.put("batterystats-checkin", "9,0,l,bt,3,850000,700000,900000,800000,1700000000000\n9,0,l,pws,300,20,20,20");
        files.put("batterystats-history", "+0ms (1) RESET\n+1s000ms (2) 090 -plugged");
        for (String key : new String[]{"brightness", "brightness-mode", "timeout", "aod", "wifi", "bluetooth", "airplane"}) files.put(key, "0");
        return files;
    }
    private static Map<String, String> end() {
        Map<String, String> files = start(); files.put("epoch", "186400"); files.put("uptime", "87400.0 100000.0");
        files.put("battery", files.get("battery").replace("90", "50").replace("270000", "150000"));
        files.put("batterystats-history", files.get("batterystats-history") + "\n+1d0h0m0s (2) 050");
        files.put("batterystats-checkin", files.get("batterystats-checkin").replace("pws,300,20,20,20", "pws,300,140,140,140"));
        return files;
    }
    /** Measured charge and Android modeled estimates have different units and names. */
    @Test public void measuredBatteryInterval() {
        var result = Measurements.compare(new Measurements.Snapshot(start()), new Measurements.Snapshot(end()));
        assertTrue(result.flags.toString(), result.qualified()); assertEquals(24, result.hours, .0001);
        assertEquals(40, result.loss, .0001); assertEquals(40.0 / 24, result.pointsPerHour, .0001);
        assertEquals(120000, result.chargeLoss, .0001); assertEquals(120, result.estimatedMah, .0001);
    }
    /** Charging between two unplugged endpoints must still invalidate the interval. */
    @Test public void detectsChargingHistory() {
        var end = end(); end.put("batterystats-history", end.get("batterystats-history") + "\n+1d0h1m (2) +plugged plug=usb");
        assertTrue(Measurements.compare(new Measurements.Snapshot(start()), new Measurements.Snapshot(end)).flags.contains("charging-during-interval"));
    }
    /** Reboots, clock changes, resets and settings changes are separate review flags. */
    @Test public void rejectsContaminatedIntervals() {
        for (String key : new String[]{"boot-id", "firmware", "brightness", "batterystats-checkin", "uptime", "batterystats-history"}) {
            var end = end(); end.put(key, key.equals("uptime") ? "1.0 1.0" : "changed");
            assertFalse(key, Measurements.compare(new Measurements.Snapshot(start()), new Measurements.Snapshot(end)).qualified());
        }
    }
    /** Missing APIs do not produce an invented zero reading. */
    @Test public void preservesUnavailableFields() {
        var a = new Measurements.Snapshot(Map.of());
        var b = new Measurements.Snapshot(Map.of());
        var result = Measurements.compare(a, b);
        assertNull(result.hours); assertNull(result.loss); assertNull(result.chargeLoss); assertNull(result.estimatedMah); assertFalse(result.qualified());
        assertEquals("unavailable", Measurements.metric(null, "ms")); assertNull(Measurements.number("NaN"));
    }
    /** Checkin's start-clock column is not its varying uptime column. */
    @Test public void readsStatsStartClock() { assertEquals(1700000000000d, new Measurements.Snapshot(start()).statsStart, .001); }
    /** Only allowed readable diagnostic strings reach the clipboard summary. */
    @Test public void redactsAddressesAndEmails() {
        assertFalse(Measurements.clean("test 192.168.1.7 test@example.org\nnext").contains("192.168.1.7"));
        assertFalse(Measurements.clean("test@example.org").contains("@"));
        assertFalse(Measurements.clean("first\nsecond").contains("\n"));
        assertTrue(Measurements.clean("x".repeat(1000)).length() <= 160);
    }
    /** Quoted surface names stay intact and incomplete results are rejected. */
    @Test public void parsesProcessorCsv() {
        var rows = Measurements.csv("name,cpu\n\"renderer, \"\"main\"\"\",100\n");
        assertEquals("renderer, \"main\"", rows.get(1).get(0));
        assertThrows(IllegalArgumentException.class, () -> Measurements.csv("\"incomplete"));
    }
}
