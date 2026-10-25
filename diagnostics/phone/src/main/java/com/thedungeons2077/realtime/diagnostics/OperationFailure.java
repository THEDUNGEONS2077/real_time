/** Error presentation: preserve the failing stage and give a concrete next action without device identifiers. */
package com.thedungeons2077.realtime.diagnostics;

import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.SocketTimeoutException;

/** Error reports are explicit-copy local summaries, not analytics or automatic crash reports. */
public final class OperationFailure {
    private OperationFailure() { }
    /** Include nested transport errors, which the ADB library sometimes wraps in an empty IOException. */
    public static String describe(String stage, Throwable error) {
        StringBuilder details = new StringBuilder(); String hint = "";
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (details.length() > 0) details.append(" / ");
            details.append(cause.getClass().getSimpleName()).append(": ").append(Text.clean(cause.getMessage()));
            if (cause instanceof SocketTimeoutException || cause instanceof NoRouteToHostException)
                hint = "The watch did not respond. Check its current port and Wi-Fi connection. A phone hotspot can help test whether the router is blocking device-to-device traffic.";
            else if (cause instanceof ConnectException)
                hint = "The connection was refused. Use the port currently shown on the watch's main Wireless debugging screen, and keep wireless debugging enabled.";
        }
        String text = details.toString();
        if (text.contains("INSTALL_FAILED_UPDATE_INCOMPATIBLE")) hint = "The installed face uses another signing key. Nothing was uninstalled. Keep it until you decide whether to remove that existing face.";
        else if (text.contains("INSTALL_FAILED_VERSION_DOWNGRADE")) hint = "A newer version is already installed. Choose that version or a newer APK; the helper does not force downgrades.";
        else if (text.contains("INSTALL_FAILED_INSUFFICIENT_STORAGE")) hint = "The watch needs more free storage before installation can finish.";
        else if (text.contains("AdbAuthenticationFailed") || text.contains("AdbPairingRequired")) hint = "Pair this helper with the watch first. Pairing from Wear Installer 2 is not shared with this app.";
        else if (stage.equals("Pairing") && hint.isEmpty()) hint = "Request a fresh pairing code and use the pairing port from the same dialog. This app has its own pairing identity.";
        return "Operation did not complete.\nStage: " + Text.clean(stage) + "\n" + Text.clean(text)
                + (hint.isEmpty() ? "" : "\n" + hint)
                + (stage.equals("Installation") ? "\nIf installation was interrupted, check the watch face list before retrying." : "")
                + "\nNo unsuccessful operation is marked accepted.";
    }
}
