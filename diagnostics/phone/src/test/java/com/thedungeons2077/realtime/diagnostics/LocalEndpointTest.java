/** Network-boundary tests: diagnostic actions must never resolve names or reach public servers. */
package com.thedungeons2077.realtime.diagnostics;

import org.junit.Test;
import static org.junit.Assert.*;

/** Validate pairing destinations before any third-party networking code runs. */
public final class LocalEndpointTest {
    /** Private watch addresses and real port numbers are accepted. */
    @Test public void acceptsPrivateNetworks() {
        for (String host : new String[]{"10.0.0.2", "172.16.0.2", "172.31.255.2", "192.168.1.20", "169.254.10.2"}) assertEquals(host, new LocalEndpoint(host, "37123").host);
    }
    /** Hostnames, shell syntax and public addresses are rejected without DNS. */
    @Test public void rejectsPublicOrAmbiguousDestinations() {
        for (String host : new String[]{"8.8.8.8", "example.com", "127.0.0.1", "172.32.0.1", "192.169.0.1", "192.168.1.999", "192.168.01.2", "192.168.1.2;id", "192.168.1.2:37123", ""})
            assertThrows(host, IllegalArgumentException.class, () -> new LocalEndpoint(host, "37123"));
    }
    /** Pairing and connection ports must be supplied separately as numeric values. */
    @Test public void validatesPortAndCode() {
        for (String port : new String[]{"0", "65536", "-1", "abc", "22;id", ""}) assertThrows(IllegalArgumentException.class, () -> new LocalEndpoint("192.168.1.2", port));
        assertEquals("012345", LocalEndpoint.pairingCode("012345"));
        assertThrows(IllegalArgumentException.class, () -> LocalEndpoint.pairingCode("12345"));
    }
}
