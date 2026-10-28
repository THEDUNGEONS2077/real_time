/** The installer accepts only the known face packages. */
package com.thedungeons2077.realtime.diagnostics;
import org.junit.Test;
import static org.junit.Assert.*;
public final class FaceCatalogTest {
    @Test public void knownFacesRoundTripWithoutAdmittingOtherApps() {
        for (String face : new String[]{"HALO", "REDLINE", "CIPHER", "NEXUS"}) assertEquals(face, FaceCatalog.name(FaceCatalog.packageName(face)));
        assertThrows(IllegalArgumentException.class, () -> FaceCatalog.name("com.thedungeons2077.realtime.diagnostics"));
        assertNull(FaceCatalog.packageName("stock"));
    }
}
