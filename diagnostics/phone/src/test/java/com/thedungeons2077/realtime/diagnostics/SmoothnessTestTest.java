/** Smoothness parsing and statistics, from synthetic SurfaceFlinger and /proc output. */
package com.thedungeons2077.realtime.diagnostics;
import org.junit.Test;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import static org.junit.Assert.*;
public final class SmoothnessTestTest {
    private static final long VSYNC = 16_666_667L;

    /** A latency dump with frames at the given present times. */
    private static String dump(long... presents) {
        StringBuilder out = new StringBuilder(VSYNC + "\n");
        for (long t : presents) out.append(t - 1000).append('\t').append(t).append('\t').append(t - 2000).append('\n');
        return out.append("0\t0\t0\n9223372036854775807\t9223372036854775807\t9223372036854775807\n").toString();
    }

    @Test public void ranksWatchFaceAndWallpaperLayersAndDropsUnsafeNames() {
        String list = "Display 0 name=\"Built-in\"#0\nBounds for - Wallpaper#3\nWallpaper BBQ wrapper#42\n"
                + "com.google.wear.watchface.runtime/WatchFaceService#7\nStatusBar#9\nwallpaper'; rm -rf /#1\n";
        List<String> candidates = SmoothnessTest.candidates(list, "com.thedungeons2077.realtime.redline");
        assertEquals(List.of("com.google.wear.watchface.runtime/WatchFaceService#7", "Wallpaper BBQ wrapper#42"), candidates);
    }

    @Test public void mergesOverlappingSamplesAndSkipsPendingRows() {
        SortedSet<Long> presents = new TreeSet<>();
        assertEquals(VSYNC, SmoothnessTest.refreshPeriod(dump(1)));
        assertEquals(3, SmoothnessTest.addPresentTimes(dump(VSYNC, 2 * VSYNC, 3 * VSYNC), presents));
        // The next sample repeats two frames and adds one.
        assertEquals(1, SmoothnessTest.addPresentTimes(dump(2 * VSYNC, 3 * VSYNC, 4 * VSYNC), presents));
        assertEquals(4, presents.size());
    }

    @Test public void reportsSteadySixtyFpsWithNoMissedFrames() {
        SortedSet<Long> presents = new TreeSet<>();
        for (int i = 0; i < 600; i++) presents.add(1_000_000_000L + i * VSYNC);
        SmoothnessTest.Result r = SmoothnessTest.analyze(presents, VSYNC);
        assertEquals(60.0, r.fps, 0.1);
        assertEquals(16.7, r.medianMs, 0.1);
        assertEquals(0.0, r.missedPercent, 0.0);
        assertEquals(0, r.idleGaps);
    }

    @Test public void countsMissedFramesButTreatsLongPausesAsIdle() {
        SortedSet<Long> presents = new TreeSet<>();
        long t = 0;
        for (int i = 0; i < 100; i++) { t += i % 10 == 0 ? 2 * VSYNC : VSYNC; presents.add(t); }
        t += 2_000_000_000L; // the face stopped drawing for two seconds
        for (int i = 0; i < 20; i++) { t += VSYNC; presents.add(t); }
        SmoothnessTest.Result r = SmoothnessTest.analyze(presents, VSYNC);
        assertEquals(1, r.idleGaps);
        assertEquals(100.0 * 9 / 118, r.missedPercent, 0.01);
        assertEquals(33.3, r.worstMs, 0.1);
        assertTrue(SmoothnessTest.card(r, 4.25).contains("Renderer CPU: 4.3% of one core"));
        assertTrue(SmoothnessTest.card(r, null).contains("Renderer CPU: unavailable"));
    }

    @Test public void rejectsTooFewFrames() {
        SortedSet<Long> presents = new TreeSet<>(List.of(1L, VSYNC));
        assertThrows(IllegalStateException.class, () -> SmoothnessTest.analyze(presents, VSYNC));
    }

    @Test public void readsCpuTicksEvenWhenTheProcessNameHasSpaces() {
        String stat = "1234 (watch face) S 1 2 3 4 5 6 7 8 9 10 250 50 0 0 20 0 30 0";
        assertEquals(300, SmoothnessTest.cpuTicks(stat));
    }

    @Test public void findsTheRendererPackageOnlyFromAWellFormedComponent() {
        assertEquals("com.google.wear.watchface.runtime", SmoothnessTest.rendererPackage("  mWallpaperComponent=ComponentInfo{com.google.wear.watchface.runtime/com.x.Service}\n"));
        assertNull(SmoothnessTest.rendererPackage("mWallpaperComponent=null"));
    }
}
