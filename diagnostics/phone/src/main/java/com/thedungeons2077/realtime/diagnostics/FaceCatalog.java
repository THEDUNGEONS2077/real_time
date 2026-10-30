/** Catalogue layer: the only watch-face packages the installer accepts. */
package com.thedungeons2077.realtime.diagnostics;

/** Known real_time faces. Signing, code and permission checks still apply to every APK. */
public final class FaceCatalog {
    private FaceCatalog() { }

    /** Display name for a face package, or an error for any other app. */
    public static String name(String packageName) {
        if ("com.thedungeons2077.realtime.halo".equals(packageName)) return "HALO";
        if ("com.thedungeons2077.realtime.redline".equals(packageName)) return "REDLINE";
        if ("com.thedungeons2077.realtime.cipher".equals(packageName)) return "CIPHER";
        if ("com.thedungeons2077.realtime.nexus".equals(packageName)) return "NEXUS";
        if ("com.thedungeons2077.realtime.jarvis".equals(packageName)) return "JARVIS";
        if ("com.thedungeons2077.realtime.reactor".equals(packageName)) return "REACTOR";
        throw new IllegalArgumentException("Choose a real_time watch-face APK (HALO, REDLINE, CIPHER, NEXUS, JARVIS or REACTOR). The installer APK itself belongs on the phone.");
    }

    /** Exact package name for a face, or null. Trusted catalogue data, never user-entered text. */
    public static String packageName(String face) {
        if ("HALO".equals(face)) return "com.thedungeons2077.realtime.halo";
        if ("REDLINE".equals(face)) return "com.thedungeons2077.realtime.redline";
        if ("CIPHER".equals(face)) return "com.thedungeons2077.realtime.cipher";
        if ("NEXUS".equals(face)) return "com.thedungeons2077.realtime.nexus";
        if ("JARVIS".equals(face)) return "com.thedungeons2077.realtime.jarvis";
        if ("REACTOR".equals(face)) return "com.thedungeons2077.realtime.reactor";
        return null;
    }
}
