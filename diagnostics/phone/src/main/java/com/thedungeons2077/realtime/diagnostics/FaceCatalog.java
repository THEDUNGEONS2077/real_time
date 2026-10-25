/** Explicit release catalogue shared by APK inspection, installation and experiment labels. */
package com.thedungeons2077.realtime.diagnostics;

/** Only known real_time face packages can reach the installer. Signing and code checks still apply. */
public final class FaceCatalog {
    private FaceCatalog() { }
    /** Return a stable display name or reject an unrelated APK. */
    public static String name(String packageName) {
        if ("com.thedungeons2077.realtime.halo".equals(packageName)) return "HALO";
        if ("com.thedungeons2077.realtime.redline".equals(packageName)) return "REDLINE";
        throw new IllegalArgumentException("Choose a HALO or REDLINE watch-face APK. The diagnostics phone APK belongs on the phone.");
    }
    /** Exact package names are trusted catalogue data, never a user-entered shell argument. */
    public static String packageName(String face) {
        if ("HALO".equals(face)) return "com.thedungeons2077.realtime.halo";
        if ("REDLINE".equals(face)) return "com.thedungeons2077.realtime.redline";
        return null;
    }
    /** Known palette IDs, shared by experiment declarations and catalogue tests. */
    public static String[] palettes(String face) {
        if ("REDLINE".equals(face)) return new String[]{"REFERENCE", "AMBER", "CYAN", "GREEN", "VIOLET", "ICE"};
        if ("HALO".equals(face)) return new String[]{"REFERENCE", "PHOSPHOR", "ICE"};
        return new String[]{"STOCK"};
    }
    /** Preserve known release provenance; unknown face versions are explicitly unavailable. */
    public static String commit(String face, String version) {
        if ("REDLINE".equals(face) && "0.2.1".equals(version)) return BuildConfig.REDLINE_EDITOR_SOURCE_COMMIT;
        if ("REDLINE".equals(face) && "0.2.0".equals(version)) return BuildConfig.REDLINE_CONTROLS_SOURCE_COMMIT;
        if ("REDLINE".equals(face) && "0.1.1".equals(version)) return BuildConfig.REDLINE_PATCH_SOURCE_COMMIT;
        if (!"0.1.0".equals(version)) return "unavailable";
        if ("HALO".equals(face)) return "053438dc20e5486f4db9604cfef5d32fe989b0fd";
        if ("REDLINE".equals(face)) return BuildConfig.REDLINE_SOURCE_COMMIT;
        return "unavailable";
    }
}
