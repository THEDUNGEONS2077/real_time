/**
 * Analysis layer: delivered frame rate of the watch-face surface, from SurfaceFlinger's frame history.
 *
 * `dumpsys SurfaceFlinger --latency <layer>` prints the display refresh period, then one
 * line per recent frame: desired-present, actual-present and frame-ready times (ns).
 * Sampling it about once a second for 20 seconds and merging the actual-present times
 * gives every frame the face delivered. That answers the question "how smooth is it?"
 * directly, without a Perfetto processor. Everything here is pure text parsing, so it is
 * unit-tested without a watch.
 */
package com.thedungeons2077.realtime.diagnostics;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.SortedSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SmoothnessTest {
    private SmoothnessTest() { }

    /** How long the test samples, and how often. 127 frames of history cover about 2 s at 60 fps. */
    public static final int SECONDS = 20, SAMPLE_MILLIS = 1000;
    /** SurfaceFlinger marks frames that have not been presented yet with this value. */
    private static final long PENDING = Long.MAX_VALUE;
    /** A gap longer than this means the face was not animating (idle), not a dropped frame. */
    private static final long IDLE_NANOS = 250_000_000L;

    /** One frame-timing summary. Times are milliseconds. */
    public static final class Result {
        public final int frames;
        public final double seconds, fps, medianMs, p95Ms, worstMs, missedPercent, displayHz;
        public final int idleGaps;
        Result(int frames, double seconds, double fps, double medianMs, double p95Ms, double worstMs, double missedPercent, double displayHz, int idleGaps) {
            this.frames = frames; this.seconds = seconds; this.fps = fps; this.medianMs = medianMs; this.p95Ms = p95Ms;
            this.worstMs = worstMs; this.missedPercent = missedPercent; this.displayHz = displayHz; this.idleGaps = idleGaps;
        }
    }

    /** Layer names that are never the watch face. */
    private static final Pattern EXCLUDED = Pattern.compile("(?i)bounds for|screendecor|display|dim layer|input|windowtoken|task=|leash|^surface\\(");

    /**
     * Rank `dumpsys SurfaceFlinger --list` lines that could be the watch-face surface.
     * WFF faces are drawn by the system watch-face runtime as a wallpaper, so names
     * mentioning the face package, "watchface" or "wallpaper" rank highest.
     */
    public static List<String> candidates(String layerList, String facePackage) {
        List<String> result = new ArrayList<>();
        for (String raw : layerList.split("\n")) {
            String line = raw.trim();
            if (line.isEmpty() || line.contains("'") || line.length() > 300 || EXCLUDED.matcher(line).find()) continue;
            if (score(line, facePackage) > 0) result.add(line);
        }
        result.sort(Comparator.comparingInt((String line) -> score(line, facePackage)).reversed().thenComparing(Comparator.naturalOrder()));
        return result;
    }

    /** Higher is more likely to be the watch face. Buffer-carrying (BLAST) layers get a small bonus. */
    static int score(String line, String facePackage) {
        String lower = line.toLowerCase(Locale.ROOT);
        int score = 0;
        if (facePackage != null && lower.contains(facePackage.toLowerCase(Locale.ROOT))) score += 6;
        if (lower.contains("watchface")) score += 5;
        if (lower.contains("wallpaper")) score += 3;
        if (score > 0 && lower.contains("bbq")) score += 1;
        return score;
    }

    /** Display refresh period in nanoseconds: the first line of a latency dump. */
    public static long refreshPeriod(String latency) {
        for (String line : latency.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.matches("\\d+")) return Long.parseLong(trimmed);
            if (!trimmed.isEmpty()) break;
        }
        throw new IllegalArgumentException("SurfaceFlinger did not report a refresh period.");
    }

    private static final Pattern FRAME = Pattern.compile("^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*$");

    /** Add every presented frame's actual-present time to `into`. Pending and empty rows are skipped. */
    public static int addPresentTimes(String latency, SortedSet<Long> into) {
        int added = 0;
        for (String line : latency.split("\n")) {
            Matcher m = FRAME.matcher(line);
            if (!m.matches()) continue;
            long present;
            try { present = Long.parseLong(m.group(2)); } catch (NumberFormatException overflow) { continue; }
            if (present <= 0 || present == PENDING) continue;
            if (into.add(present)) added++;
        }
        return added;
    }

    /** Summarize merged present times. Gaps over 250 ms count as idle time, not as dropped frames. */
    public static Result analyze(SortedSet<Long> presents, long refreshNanos) {
        Long[] times = presents.toArray(new Long[0]);
        List<Long> intervals = new ArrayList<>();
        int idle = 0;
        long animatingNanos = 0;
        for (int i = 1; i < times.length; i++) {
            long gap = times[i] - times[i - 1];
            if (gap > IDLE_NANOS) { idle++; continue; }
            intervals.add(gap);
            animatingNanos += gap;
        }
        if (intervals.size() < 10) throw new IllegalStateException("Too few frames were recorded. Keep the face visible and moving, then try again.");
        long[] sorted = intervals.stream().mapToLong(Long::longValue).sorted().toArray();
        // A frame is missed when it arrives more than half a refresh later than the next vsync.
        long missedThreshold = refreshNanos + refreshNanos / 2;
        long missed = Arrays.stream(sorted).filter(gap -> gap > missedThreshold).count();
        double seconds = animatingNanos / 1e9;
        return new Result(sorted.length + 1, seconds, sorted.length / seconds,
                sorted[sorted.length / 2] / 1e6, sorted[(int) Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] / 1e6,
                sorted[sorted.length - 1] / 1e6, 100.0 * missed / sorted.length, 1e9 / refreshNanos, idle);
    }

    /** CPU time (user + system ticks) from one /proc/PID/stat line. The name field may contain spaces. */
    public static long cpuTicks(String stat) {
        int close = stat.lastIndexOf(')');
        if (close < 0) throw new IllegalArgumentException("Unexpected process stat format.");
        String[] fields = stat.substring(close + 2).trim().split("\\s+");
        // After "pid (name) ", field 0 is state; utime and stime are fields 11 and 12.
        return Long.parseLong(fields[11]) + Long.parseLong(fields[12]);
    }

    /** Package name of the active wallpaper (the watch-face renderer) from `dumpsys wallpaper`, or null. */
    public static String rendererPackage(String wallpaperDump) {
        Matcher m = Pattern.compile("mWallpaperComponent=ComponentInfo\\{([a-zA-Z][a-zA-Z0-9_.]*)/").matcher(wallpaperDump);
        return m.find() ? m.group(1) : null;
    }

    /** The plain-language result card shown first in the report. */
    public static String card(Result r, Double cpuPercent) {
        return String.format(Locale.ROOT,
                "SMOOTHNESS\nDelivered: %.1f fps (display %.0f Hz)\nFrame time: median %.1f ms · 95th %.1f ms · worst %.1f ms\n"
                        + "Missed frames: %.1f%% of intervals\nRenderer CPU: %s\nFrames: %d over %.1f s of motion%s\n",
                r.fps, r.displayHz, r.medianMs, r.p95Ms, r.worstMs, r.missedPercent,
                cpuPercent == null ? "unavailable" : String.format(Locale.ROOT, "%.1f%% of one core", cpuPercent),
                r.frames, r.seconds, r.idleGaps == 0 ? "" : String.format(Locale.ROOT, " (%d idle gap%s skipped)", r.idleGaps, r.idleGaps == 1 ? "" : "s"));
    }
}
