/** Phone-only analysis: execute the pinned processor after collection, with no watch-side analysis overhead. */
package com.thedungeons2077.realtime.diagnostics;

import android.content.Context;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** Small, copyable trace summary; exact renderer attribution is optional and explicit. */
public final class TraceAnalysis {
    private final File processor, trace, scratch;

    /** Read an executable installed by Android, never code from an export or writable storage. */
    public TraceAnalysis(Context context, File traceFile, File runDirectory) {
        processor = new File(context.getApplicationInfo().nativeLibraryDir, "libtrace_processor.so");
        trace = traceFile; scratch = runDirectory;
    }

    /** Build a summary even when a watch or phone does not expose some sources. */
    public String report(String selectedProcess, String selectedLayer) {
        StringBuilder out = new StringBuilder("PERFORMANCE\n");
        try {
            double duration = scalar("SELECT (end_ts-start_ts)/1e6 FROM trace_bounds;");
            double loss = scalar("SELECT COALESCE(SUM(value),0) FROM stats WHERE severity='data_loss' AND value>0;");
            out.append("Trace coverage: ").append(Measurements.metric(duration, "ms")).append('\n');
            out.append("Data-loss events: ").append((long) loss).append('\n');
            if (Math.abs(duration - 30000) > 3000 || loss > 0) out.append("REPEAT: incomplete coverage or trace data loss.\n");
            List<List<String>> cpu = query("SELECT p.name, SUM(s.dur)/1e6 FROM sched s JOIN thread t USING(utid) JOIN process p USING(upid) WHERE s.dur>0 GROUP BY p.upid ORDER BY SUM(s.dur) DESC;");
            if (selectedProcess.isBlank()) out.append("Selected renderer CPU: unavailable; no renderer selected.\n");
            else {
                double total = 0; boolean found = false;
                for (List<String> row : cpu) if (row.size() >= 2 && row.get(0).equals(selectedProcess)) { total += Double.parseDouble(row.get(1)); found = true; }
                out.append("Selected renderer CPU: ").append(Measurements.metric(found ? total : null, "ms")).append('\n');
            }
            out.append("CPU processes (shared system activity, not exclusive face cost):\n");
            if (cpu.isEmpty()) out.append("unavailable\n");
            for (List<String> row : cpu.subList(0, Math.min(cpu.size(), 8))) if (row.size() >= 2)
                out.append(Measurements.clean(row.get(0))).append(": ").append(Measurements.metric(Measurements.number(row.get(1)), "ms")).append('\n');
            List<List<String>> layers = query("SELECT DISTINCT layer_name FROM actual_frame_timeline_slice WHERE layer_name IS NOT NULL;");
            out.append("Available frame layers:\n");
            if (layers.isEmpty()) out.append("unavailable\n");
            for (List<String> row : layers.subList(0, Math.min(layers.size(), 12))) out.append(Measurements.clean(row.get(0))).append('\n');
            if (selectedLayer.isBlank()) out.append("Selected surface frame timing: unavailable; no layer selected.\n");
            else {
                List<List<String>> frames = query("SELECT dur/1e6,jank_type FROM actual_frame_timeline_slice WHERE dur>0 AND layer_name=" + sqlString(selectedLayer) + " ORDER BY dur;");
                if (frames.isEmpty()) out.append("Selected surface frame timing: unavailable.\n");
                else {
                    int count = frames.size(); long jank = frames.stream().filter(r -> r.size() >= 2 && !r.get(1).equals("None") && !r.get(1).equals("[NULL]")).count();
                    out.append("Selected surface: ").append(Measurements.clean(selectedLayer)).append('\n');
                    out.append("Frames: ").append(count).append("; marked janky: ").append(jank).append('\n');
                    out.append("Frame duration p50: ").append(Measurements.metric(Measurements.number(frames.get((int) Math.ceil(count * .5) - 1).get(0)), "ms")).append('\n');
                    out.append("Frame duration p95: ").append(Measurements.metric(Measurements.number(frames.get((int) Math.ceil(count * .95) - 1).get(0)), "ms")).append('\n');
                }
            }
        } catch (Exception error) {
            out.append("Some metrics unavailable: phone processor or watch trace source failed. Raw capture stays on this phone.\n");
        }
        out.append("Renderer/surface measurements are not isolated face energy.\n");
        return out.toString();
    }

    private double scalar(String sql) throws Exception {
        List<List<String>> rows = query(sql);
        if (rows.isEmpty() || rows.get(0).isEmpty() || Measurements.number(rows.get(0).get(0)) == null) throw new IOException("Metric unavailable.");
        return Double.parseDouble(rows.get(0).get(0));
    }

    private List<List<String>> query(String sql) throws Exception {
        File output = new File(scratch, "processor-output.tmp"), errors = new File(scratch, "processor-errors.txt");
        Process process = new ProcessBuilder(processor.getAbsolutePath(), "-Q", sql, trace.getAbsolutePath())
                .redirectOutput(output).redirectError(errors).start();
        var deadline = Executors.newSingleThreadScheduledExecutor();
        var killer = deadline.schedule(process::destroyForcibly, 45, TimeUnit.SECONDS);
        try {
            if (process.waitFor() != 0) throw new IOException("Trace processor failed.");
            if (output.length() > 4 * 1024 * 1024) throw new IOException("Processor output too large.");
            List<List<String>> rows = new ArrayList<>(Measurements.csv(new String(Files.readAllBytes(output.toPath()), StandardCharsets.UTF_8)));
            if (!rows.isEmpty()) rows.remove(0);
            return rows;
        } finally { if (process.isAlive()) process.destroyForcibly(); killer.cancel(false); deadline.shutdownNow(); }
    }

    /** Treat exact process/layer selections as data within our fixed SQL statements. */
    public static String sqlString(String input) { return "'" + input.replace("'", "''") + "'"; }
}
