/** Pure measurement layer: interpret endpoint deltas, reject contamination and format safe summaries. */
package com.thedungeons2077.realtime.diagnostics;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Shared semantics with tools/measure: null is unavailable and battery measurements cover the whole watch. */
public final class Measurements {
    private Measurements() { }

    /** Seven HALO switch IDs are stable experiment labels, not writable watch preferences. */
    public static final String[] EFFECTS = {"seconds", "ring_a", "ring_b", "breathing", "nodes", "scan", "tilt"};

    /** A minimal typed endpoint; raw device identifiers are used locally for validation only. */
    public static final class Snapshot {
        /** Private source fields; never copied wholesale to a report. */
        public final Map<String, String> files;
        /** Supported counters, clocks and battery values; absent values are null. */
        public final Double epoch, uptime, level, scale, charge, statsStart;
        /** Identity/history fields used for local continuity checks. */
        public final String boot, firmware, history;
        /** Charging state, when exposed by BatteryManager's system dump. */
        public final Boolean plugged;

        /** Parse our capture protocol, preserving unsupported fields. */
        public Snapshot(Map<String, String> input) {
            files = new LinkedHashMap<>(input);
            epoch = number(text("epoch"));
            uptime = number(text("uptime").split("\\s+", 2)[0]);
            level = field(text("battery"), "level");
            scale = field(text("battery"), "scale");
            charge = field(text("battery"), "Charge counter");
            boot = text("boot-id").trim();
            firmware = text("firmware").trim();
            history = text("batterystats-history");
            statsStart = checkin(text("batterystats-checkin"), "bt", 9);
            Matcher powered = Pattern.compile("(?im)^\\s*(?:AC|USB|Wireless|Dock) powered:\\s*(true|false)").matcher(text("battery"));
            boolean seen = false, charging = false;
            while (powered.find()) { seen = true; charging |= powered.group(1).equals("true"); }
            Double status = field(text("battery"), "status");
            plugged = seen ? charging || (status != null && status == 2) : null;
        }

        /** Read one named endpoint field, without interpreting it as code. */
        public String text(String name) { return files.getOrDefault(name, ""); }
        /** Normalize a supported level to percent. */
        public Double percent() { return level != null && scale != null && scale > 0 ? level * 100 / scale : null; }
    }

    /** Derived whole-watch battery use and qualification flags. */
    public static final class Battery {
        /** Whole-watch measured deltas and the separately named Android power estimate. */
        public Double hours, loss, pointsPerHour, chargeLoss, estimatedMah;
        /** Reasons the interval needs review or repetition. */
        public final Set<String> flags = new LinkedHashSet<>();
        /** Only a fully checked interval can be presented as suitable for comparison. */
        public boolean qualified() { return flags.isEmpty(); }
    }

    /** Calculate deltas without clearing the watch's existing battery history. */
    public static Battery compare(Snapshot a, Snapshot b) {
        Battery result = new Battery();
        if (a.epoch != null && b.epoch != null && b.epoch > a.epoch) result.hours = (b.epoch - a.epoch) / 3600;
        else result.flags.add("missing-or-invalid-duration");
        if (a.boot.isEmpty() || b.boot.isEmpty()) result.flags.add("boot-identity-unavailable");
        else if (!a.boot.equals(b.boot)) result.flags.add("reboot");
        if (a.uptime != null && b.uptime != null && a.epoch != null && b.epoch != null) {
            if (b.uptime < a.uptime) result.flags.add("reboot");
            else if (Math.abs((b.uptime - a.uptime) - (b.epoch - a.epoch)) > 120) result.flags.add("wall-clock-change");
        }
        if (a.statsStart == null || b.statsStart == null) result.flags.add("statistics-start-unavailable");
        else if (!a.statsStart.equals(b.statsStart)) result.flags.add("statistics-reset");
        if (a.plugged == null || b.plugged == null) result.flags.add("charging-state-unavailable");
        if (Boolean.TRUE.equals(a.plugged) || Boolean.TRUE.equals(b.plugged)) result.flags.add("charging-at-endpoint");
        if (!a.firmware.isEmpty() && !b.firmware.isEmpty() && !a.firmware.equals(b.firmware)) result.flags.add("firmware-changed");
        for (String key : new String[]{"brightness", "brightness-mode", "timeout", "aod", "wifi", "bluetooth", "airplane"}) {
            if (a.text(key).isBlank() || b.text(key).isBlank() || a.text(key).trim().equals("null") || b.text(key).trim().equals("null"))
                result.flags.add("setting-unavailable:" + key);
            else if (!a.text(key).trim().equals(b.text(key).trim())) result.flags.add("condition-changed:" + key);
        }
        List<String> first = events(a.history), last = events(b.history);
        if (first.isEmpty() || last.isEmpty()) result.flags.add("history-unavailable-or-unrecognized");
        else {
            int index = last.lastIndexOf(first.get(first.size() - 1));
            if (index < 0) result.flags.add("history-gap");
            else {
                String added = String.join("\n", last.subList(index + 1, last.size()));
                if (Pattern.compile("\\+plugged|plug=(?:ac|usb|wireless)|(?:^|,)\\+p(?:,|$)", Pattern.MULTILINE).matcher(added).find()) result.flags.add("charging-during-interval");
                if (Pattern.compile("\\b(?:RESET|START|SHUTDOWN)\\b").matcher(added).find()) result.flags.add("history-reset-or-reboot");
            }
        }
        Double ap = a.percent(), bp = b.percent();
        if (ap != null && bp != null) {
            result.loss = ap - bp;
            if (result.loss < 0) result.flags.add("battery-level-increased");
            if (result.hours != null) result.pointsPerHour = result.loss / result.hours;
        } else result.flags.add("battery-level-unavailable");
        if (a.charge != null && b.charge != null && a.charge > 0 && b.charge > 0) {
            result.chargeLoss = a.charge - b.charge;
            if (result.chargeLoss < 0) result.flags.add("charge-counter-increased");
        }
        Double estimateA = checkin(a.text("batterystats-checkin"), "pws", 5), estimateB = checkin(b.text("batterystats-checkin"), "pws", 5);
        if (estimateA != null && estimateB != null && a.statsStart != null && a.statsStart.equals(b.statsStart) && estimateB >= estimateA)
            result.estimatedMah = estimateB - estimateA;
        if (result.hours != null && Math.abs(result.hours - 24) > 1) result.flags.add("duration-outside-24h-protocol");
        return result;
    }

    /** Plain-number formatting keeps copied reports easy to compare across locales. */
    public static String metric(Double value, String unit) {
        return value == null || !Double.isFinite(value) ? "unavailable" : String.format(Locale.ROOT, "%.3f %s", value, unit);
    }

    /** Do not allow raw control characters or a huge device-provided string into a summary. */
    public static String clean(String input) {
        String value = input == null ? "unavailable" : input.replaceAll("[\\p{Cntrl}]", " ")
                .replaceAll("\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b", "[address omitted]")
                .replaceAll("[A-Za-z0-9_.+%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[email omitted]").trim();
        return value.isEmpty() ? "unavailable" : value.substring(0, Math.min(value.length(), 160));
    }

    /** Read one known field from a dumpsys battery response. */
    public static Double field(String text, String name) {
        Matcher m = Pattern.compile("(?im)^\\s*" + Pattern.quote(name) + ":\\s*(-?[0-9.]+)\\s*$").matcher(text);
        return m.find() ? number(m.group(1)) : null;
    }

    /** Parse finite values only; missing service output must not become zero. */
    public static Double number(String text) {
        try { double value = Double.parseDouble(text.trim()); return Double.isFinite(value) ? value : null; }
        catch (NumberFormatException error) { return null; }
    }

    /** AOSP checkin columns are numeric data, not trusted CSV formulas. */
    public static Double checkin(String text, String type, int column) {
        for (String line : text.split("\\r?\\n")) {
            String[] fields = line.split(",", -1);
            if (fields.length > column && fields.length > 3 && fields[3].equals(type)) return number(fields[column]);
        }
        return null;
    }

    private static List<String> events(String text) {
        List<String> result = new ArrayList<>();
        for (String line : text.split("\\r?\\n")) if (line.trim().matches("\\+?[0-9].*\\(.*") || line.trim().matches("[0-9]+,h,.*")) result.add(line.trim());
        return result;
    }

    /** CSV reader for Perfetto output, including quoted process/surface names. */
    public static List<List<String>> csv(String text) {
        List<List<String>> rows = new ArrayList<>(); List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder(); boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"') {
                if (quoted && i + 1 < text.length() && text.charAt(i + 1) == '"') { cell.append('"'); i++; }
                else quoted = !quoted;
            } else if (c == ',' && !quoted) { row.add(cell.toString()); cell.setLength(0); }
            else if (c == '\n' && !quoted) { row.add(cell.toString().replace("\r", "")); rows.add(row); row = new ArrayList<>(); cell.setLength(0); }
            else cell.append(c);
        }
        if (quoted) throw new IllegalArgumentException("Incomplete processor output.");
        if (cell.length() > 0 || !row.isEmpty()) { row.add(cell.toString()); rows.add(row); }
        return rows;
    }
}
