/** Read-only runtime diagnostics: retain relevant renderer warnings/errors, not a whole system log. */
package com.thedungeons2077.realtime.diagnostics;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/** Pure parser for Android logcat's brief format, with bounded explicit-copy output. */
public final class RendererReport {
    private RendererReport() { }
    private static final Pattern BRIEF = Pattern.compile("^([VDIWEFAS])/([^\\(]+)\\(\\s*(\\d+)\\s*\\):\\s?(.*)$");
    private static final Pattern PROCESS = Pattern.compile("Process:\\s*([^,\\s]+),\\s*PID:\\s*(\\d+)");

    private static boolean runtime(String name) {
        String n = name.toLowerCase(java.util.Locale.ROOT);
        return n.contains("dwf") || n.contains("wff") || n.contains("watchface") && (n.contains("runtime") || n.contains("render"));
    }

    /** PIDs are used only for local attribution and never included in the copied summary. */
    public static String summarize(String processes, String main, String crash, String status) {
        Set<String> ids = new LinkedHashSet<>(), names = new LinkedHashSet<>();
        for (String line : processes.split("\\r?\\n")) {
            String[] fields = line.trim().split("\\s+");
            if (fields.length >= 2 && fields[0].matches("[0-9]+") && runtime(fields[fields.length - 1])) {
                ids.add(fields[0]); names.add(fields[fields.length - 1]);
            }
        }
        String logs = main + "\n" + crash;
        // Crashed processes can be absent from ps. Their explicit crash record still establishes attribution.
        var process = PROCESS.matcher(logs);
        while (process.find()) if (runtime(process.group(1))) { ids.add(process.group(2)); names.add(process.group(1)); }
        Set<String> relevant = new LinkedHashSet<>();
        for (String line : logs.split("\\r?\\n")) {
            var record = BRIEF.matcher(line.trim());
            if (!record.matches() || !"WEFA".contains(record.group(1))) continue;
            String tag = record.group(2).trim(), message = record.group(4);
            if (!ids.contains(record.group(3)) && !runtime(tag)) continue;
            if (message.matches("(?i).*(?:serial(?:number)?|android_id|device_id|pairing.code|password|token)\\s*[:=].*")) continue;
            // Keep the diagnostic resource IDs and stack locations, while removing device identifiers and PIDs.
            message = message.replaceAll("PID:\\s*\\d+", "PID: omitted")
                    .replaceAll("(?i)\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b", "[identifier omitted]")
                    .replaceAll("(?i)\\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\\b", "[address omitted]");
            relevant.add(record.group(1) + "/" + Measurements.clean(tag) + ": " + Measurements.clean(message));
        }
        StringBuilder out = new StringBuilder("WATCH RENDERER DIAGNOSTICS\nRead-only capture of existing log buffers; no continuous logger was started or buffer cleared.\n");
        if (status.contains("failed:")) out.append("Some collection commands failed; unavailable sources cannot establish a clean render.\n");
        out.append("Renderer processes: ");
        if (names.isEmpty()) out.append("unavailable / not identified\n");
        else out.append(names.stream().limit(8).map(Measurements::clean).collect(java.util.stream.Collectors.joining(", "))).append('\n');
        if (relevant.isEmpty()) out.append("Relevant warnings/errors: none found in the available buffers. This does not prove the face rendered successfully.\n");
        else {
            List<String> lines = new ArrayList<>(relevant);
            out.append("Relevant warnings/errors (newest 80 distinct entries at most):\n");
            for (String line : lines.subList(Math.max(0, lines.size() - 80), lines.size())) out.append(line).append('\n');
        }
        out.append("These are shared renderer logs and can include a previously selected face. Review before copying. Raw system logs stay on this phone.\n");
        return out.toString();
    }
}
