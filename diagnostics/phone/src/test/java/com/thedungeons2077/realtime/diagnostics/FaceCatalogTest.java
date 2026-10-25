/** Catalogue names, exact destinations and release provenance must stay aligned. */
package com.thedungeons2077.realtime.diagnostics;
import org.junit.Test;
import static org.junit.Assert.*;
public final class FaceCatalogTest {
    @Test public void bothFacesRoundTripWithoutAdmittingOtherApps() {
        for (String face : new String[]{"HALO", "REDLINE"}) assertEquals(face, FaceCatalog.name(FaceCatalog.packageName(face)));
        assertThrows(IllegalArgumentException.class, () -> FaceCatalog.name("com.thedungeons2077.realtime.diagnostics"));
        assertNull(FaceCatalog.packageName("stock"));
    }
    @Test public void paletteDeclarationsMatchEachFace() {
        assertArrayEquals(new String[]{"REFERENCE", "AMBER", "CYAN", "GREEN", "VIOLET", "ICE"}, FaceCatalog.palettes("REDLINE"));
        assertArrayEquals(new String[]{"REFERENCE", "PHOSPHOR", "ICE"}, FaceCatalog.palettes("HALO"));
        assertArrayEquals(new String[]{"STOCK"}, FaceCatalog.palettes("OTHER"));
    }
    @Test public void effectPresetsMatchCurrentAndHistoricalFaceCatalogues() {
        assertArrayEquals(new String[]{"seconds", "ring_a", "ring_b", "breathing", "scan", "tilt"}, FaceCatalog.effects("REDLINE"));
        assertEquals(8, FaceCatalog.effectPresets("REDLINE").length);
        assertEquals("FULL EXCEPT SCAN", FaceCatalog.effectPresets("REDLINE")[6]);
        assertEquals(9, FaceCatalog.effectPresets("HALO").length);
        assertEquals(7, FaceCatalog.reportEffects("REDLINE", "0.2.1").length);
        assertEquals(6, FaceCatalog.reportEffects("REDLINE", "0.3.0").length);
        assertEquals(7, FaceCatalog.effects("HALO").length);
    }
    @Test public void unknownVersionsDoNotAcquireInventedProvenance() {
        assertEquals("unavailable", FaceCatalog.commit("REDLINE", "9.9.9"));
        assertEquals("unavailable", FaceCatalog.commit("STOCK", "0.1.0"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.1.0").matches("[0-9a-f]{40}"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.3.1").matches("[0-9a-f]{40}"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.3.0").matches("[0-9a-f]{40}"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.2.1").matches("[0-9a-f]{40}"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.2.0").matches("[0-9a-f]{40}"));
        assertTrue(FaceCatalog.commit("REDLINE", "0.1.1").matches("[0-9a-f]{40}"));
    }
}
