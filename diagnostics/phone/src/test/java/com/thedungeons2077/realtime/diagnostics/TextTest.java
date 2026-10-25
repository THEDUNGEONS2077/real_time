/** Copyable text never carries addresses, emails or control characters. */
package com.thedungeons2077.realtime.diagnostics;
import org.junit.Test;
import static org.junit.Assert.*;
public final class TextTest {
    @Test public void removesAddressesEmailsAndControlCharacters() {
        assertEquals("connect [address omitted]:5555 failed for [email omitted]", Text.clean("connect 192.168.1.20:5555 failed\nfor a.b@example.com"));
        assertEquals("unavailable", Text.clean(null));
        assertEquals("unavailable", Text.clean("  \t "));
        assertEquals(160, Text.clean("x".repeat(500)).length());
    }
}
