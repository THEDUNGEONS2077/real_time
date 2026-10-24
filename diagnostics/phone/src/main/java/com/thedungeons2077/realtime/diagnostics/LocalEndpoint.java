/** Transport boundary: accept numeric private-LAN watch addresses without DNS or public endpoints. */
package com.thedungeons2077.realtime.diagnostics;

/** Validated pairing/connection destination. It never appears in copied reports. */
public final class LocalEndpoint {
    /** Numeric private-network address; no name resolution occurs. */
    public final String host;
    /** Explicit pairing or connection port from the watch. */
    public final int port;

    /** Validate before the ADB library is allowed to open a socket. */
    public LocalEndpoint(String address, String portText) {
        String[] parts = address.trim().split("\\.", -1);
        if (parts.length != 4) throw new IllegalArgumentException("Enter the watch's private Wi-Fi IPv4 address.");
        int[] octets = new int[4];
        for (int i = 0; i < 4; i++) {
            if (!parts[i].matches("0|[1-9][0-9]{0,2}")) throw new IllegalArgumentException("Use the numeric address shown on the watch.");
            octets[i] = Integer.parseInt(parts[i]);
            if (octets[i] > 255) throw new IllegalArgumentException("Invalid watch address.");
        }
        boolean local = octets[0] == 10 || (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31)
                || (octets[0] == 192 && octets[1] == 168) || (octets[0] == 169 && octets[1] == 254);
        if (!local) throw new IllegalArgumentException("Only a private local-network watch address is allowed.");
        if (!portText.trim().matches("[0-9]{1,5}")) throw new IllegalArgumentException("Enter the port shown on the watch.");
        port = Integer.parseInt(portText.trim());
        if (port < 1 || port > 65535) throw new IllegalArgumentException("Port must be between 1 and 65535.");
        host = String.join(".", parts);
    }

    /** Reject malformed or accidentally pasted pairing codes before connecting. */
    public static String pairingCode(String code) {
        String clean = code.trim();
        if (!clean.matches("[0-9]{6}")) throw new IllegalArgumentException("Enter the watch's six-digit pairing code.");
        return clean;
    }
}
