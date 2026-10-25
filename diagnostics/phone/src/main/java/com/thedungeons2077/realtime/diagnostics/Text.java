/** Utility layer: make any text safe to show and copy. */
package com.thedungeons2077.realtime.diagnostics;

/** Shared text cleaning for status lines and copyable error reports. */
public final class Text {
    private Text() { }

    /**
     * Remove control characters, IP addresses and email addresses, and bound the length.
     * Used on every message that comes from the watch, an exception or an APK.
     */
    public static String clean(String input) {
        String value = input == null ? "unavailable" : input.replaceAll("[\\p{Cntrl}]", " ")
                .replaceAll("\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b", "[address omitted]")
                .replaceAll("[A-Za-z0-9_.+%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[email omitted]").trim();
        return value.isEmpty() ? "unavailable" : value.substring(0, Math.min(value.length(), 160));
    }
}
