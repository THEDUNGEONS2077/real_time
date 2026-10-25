/**
 * Phone UI: connect to the watch, pick a face APK, install it with a progress bar and a clear result.
 *
 * A downloaded APK can also be opened straight into this screen ("Open with" from Files or a browser).
 * Installation always needs an explicit tap on INSTALL TO WATCH.
 */
package com.thedungeons2077.realtime.diagnostics;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.PersistableBundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A native screen with no embedded browser, remote content or background service. */
public final class MainActivity extends Activity {
    private static final int PICK_APK = 41;
    private static final int BACKGROUND = Color.rgb(5, 11, 18), PALE = Color.rgb(207, 239, 247), CYAN = Color.rgb(111, 208, 230),
            AMBER = Color.rgb(244, 185, 66), GREEN = Color.rgb(116, 255, 107), RED = Color.rgb(255, 90, 90);
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    /** Controls disabled while work runs. CANCEL is not among them. */
    private final List<View> controls = new ArrayList<>();
    private LinearLayout page, pairing;
    private TextView status, selection, result, resultDetail;
    private EditText host, connectionPort, pairPort, code;
    private ProgressBar progress;
    private Button cancel, install, copyError;
    private volatile FaceApk selectedApk;
    private Installer installer;
    private boolean busy;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installer = new Installer(this, message -> runOnUiThread(() -> { if (!isDestroyed()) status.setText(message); }));
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BACKGROUND);
        page = new LinearLayout(this); page.setOrientation(LinearLayout.VERTICAL); page.setPadding(dp(22), dp(16), dp(22), dp(28));
        scroll.addView(page);
        // Target-36 edge-to-edge: keep controls clear of system bars and the keyboard.
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom); return insets;
        });
        setContentView(scroll);
        var preferences = getPreferences(MODE_PRIVATE);
        boolean paired = preferences.getBoolean("paired", false);

        text(page, "<real_time>\nINSTALLER", 24, CYAN);
        status = text(page, paired ? "Ready. Choose a face APK, then tap INSTALL TO WATCH." : "First time: pair with the watch below.", 14, AMBER);

        // ---- WATCH: address, port and first-time pairing.
        heading("WATCH");
        host = field(page, "WATCH WI-FI ADDRESS", "192.168.1.20", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        host.setText(preferences.getString("host", ""));
        connectionPort = field(page, "CONNECTION PORT", "Shown under Wireless debugging", InputType.TYPE_CLASS_NUMBER);
        connectionPort.setText(preferences.getString("port", ""));
        button(page, "TEST CONNECTION", AMBER, () -> {
            LocalEndpoint endpoint = currentEndpoint();
            run("Connection", false, () -> {
                String model = installer.checkConnection(endpoint);
                return new Outcome(true, "✓ CONNECTED", model + " is reachable. You can install now.");
            });
        });
        Button pairToggle = button(page, paired ? "PAIR AGAIN (ONLY IF CONNECTING FAILS) ▾" : "PAIR WITH THE WATCH (FIRST TIME) ▾", CYAN, () ->
                pairing.setVisibility(pairing.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        pairToggle.setBackgroundColor(Color.TRANSPARENT);
        pairing = new LinearLayout(this); pairing.setOrientation(LinearLayout.VERTICAL); pairing.setVisibility(paired ? View.GONE : View.VISIBLE); page.addView(pairing);
        text(pairing, "On the watch: Settings › Developer options › Wireless debugging › Pair new device. Phone and watch on the same Wi-Fi.", 12, PALE);
        pairPort = field(pairing, "PAIRING PORT", "From Pair new device", InputType.TYPE_CLASS_NUMBER);
        code = field(pairing, "PAIRING CODE", "Six digits", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        code.setSaveEnabled(false);
        button(pairing, "PAIR", AMBER, () -> {
            LocalEndpoint endpoint = new LocalEndpoint(host.getText().toString(), pairPort.getText().toString());
            String pairingCode = LocalEndpoint.pairingCode(code.getText().toString());
            getPreferences(MODE_PRIVATE).edit().putString("host", endpoint.host).apply();
            code.setText("");
            run("Pairing", false, () -> {
                installer.pair(endpoint, pairingCode);
                getPreferences(MODE_PRIVATE).edit().putBoolean("paired", true).apply();
                runOnUiThread(() -> pairing.setVisibility(View.GONE));
                return new Outcome(true, "✓ PAIRED", "Now enter the connection port from the main Wireless debugging screen.");
            });
        });

        // ---- FACE: choose, install, watch the progress bar, read the result.
        heading("FACE");
        button(page, "CHOOSE FACE APK", AMBER, () -> {
            Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_LOCAL_ONLY, true);
            startActivityForResult(picker, PICK_APK);
        });
        selection = text(page, "No APK selected.", 13, PALE);
        install = button(page, "INSTALL TO WATCH", GREEN, () -> {
            FaceApk apk = selectedApk;
            if (apk == null) throw new IllegalStateException("Choose a face APK first.");
            LocalEndpoint endpoint = currentEndpoint();
            run("Installation", true, () -> {
                installer.install(endpoint, apk, sent -> runOnUiThread(() -> {
                    // Determinate while sending; indeterminate while the watch installs.
                    progress.setIndeterminate(sent >= 100);
                    progress.setProgress(sent);
                }));
                String name = FaceCatalog.name(apk.packageName);
                return new Outcome(true, "✓ " + name + " " + apk.versionName + " INSTALLED",
                        "Already using " + name + "? The update is live now.\nOtherwise, on the watch: long-press the face › + › " + name + ".\nTurn wireless debugging off when you are done.");
            });
        });
        install.setTextSize(18);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100); progress.setVisibility(View.GONE); page.addView(progress);
        cancel = new Button(this); cancel.setText("CANCEL"); cancel.setTypeface(Typeface.MONOSPACE); cancel.setTextColor(AMBER); cancel.setVisibility(View.GONE);
        cancel.setOnClickListener(view -> { installer.disconnect(); status.setText("Cancelling…"); });
        page.addView(cancel);

        // ---- RESULT: a large success or failure line, its details, and a copy button for errors.
        result = text(page, "", 22, GREEN); result.setGravity(Gravity.CENTER_HORIZONTAL); result.setVisibility(View.GONE);
        resultDetail = text(page, "", 13, PALE); resultDetail.setVisibility(View.GONE); resultDetail.setTextIsSelectable(true);
        copyError = button(page, "COPY ERROR DETAILS", AMBER, this::copyError);
        copyError.setVisibility(View.GONE);

        button(page, "THIRD-PARTY NOTICES", PALE, () -> {
            try (var input = getAssets().open("third-party.txt")) {
                new android.app.AlertDialog.Builder(this).setTitle("Third-party components").setMessage(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
                        .setPositiveButton("CLOSE", null).show();
            }
        });
        receive(getIntent());
    }

    /** An APK opened or shared into the app ("Open with real_time installer"). */
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); receive(intent); }

    private void receive(Intent intent) {
        if (intent == null) return;
        Uri uri = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getData()
                : Intent.ACTION_SEND.equals(intent.getAction()) ? intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class) : null;
        if (uri != null) load(uri);
    }

    @Override protected void onActivityResult(int request, int resultCode, Intent data) {
        super.onActivityResult(request, resultCode, data);
        if (request == PICK_APK && resultCode == RESULT_OK && data != null && data.getData() != null) load(data.getData());
    }

    /** Copy the chosen APK privately and check it is a signed, code-free real_time face. */
    private void load(Uri document) {
        FaceApk previous = selectedApk; selectedApk = null;
        if (previous != null) previous.close();
        selection.setText(R.string.checking_apk);
        run("APK selection", false, () -> {
            FaceApk apk = FaceApk.select(this, document);
            if (isDestroyed()) { apk.close(); throw new java.io.IOException("Screen closed while checking the APK."); }
            selectedApk = apk;
            runOnUiThread(() -> { if (!isDestroyed()) selection.setText(FaceCatalog.name(apk.packageName) + " " + apk.versionName + " (build " + apk.versionCode + ") — ready"); });
            return null;
        });
    }

    private LocalEndpoint currentEndpoint() {
        LocalEndpoint endpoint = new LocalEndpoint(host.getText().toString(), connectionPort.getText().toString());
        getPreferences(MODE_PRIVATE).edit().putString("host", endpoint.host).putString("port", String.valueOf(endpoint.port)).apply();
        return endpoint;
    }

    private void copyError() {
        String text = installer.lastError();
        if (text.isEmpty()) return;
        ClipData clip = ClipData.newPlainText("real_time installer error", text);
        PersistableBundle extras = new PersistableBundle(); extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true); clip.getDescription().setExtras(extras);
        getSystemService(ClipboardManager.class).setPrimaryClip(clip);
        status.setText(R.string.copied);
    }

    /** What a finished action shows. A null outcome means "no result panel" (for example, APK selection). */
    private static final class Outcome {
        final boolean ok; final String title, detail;
        Outcome(boolean ok, String title, String detail) { this.ok = ok; this.title = title; this.detail = detail; }
    }

    /** Run one action off the UI thread with progress and CANCEL; show its outcome or its error. */
    private void run(String action, boolean determinate, Task task) {
        if (busy) return;
        busy = true;
        for (View view : controls) view.setEnabled(false);
        result.setVisibility(View.GONE); resultDetail.setVisibility(View.GONE); copyError.setVisibility(View.GONE);
        progress.setIndeterminate(!determinate); progress.setProgress(0); progress.setVisibility(View.VISIBLE);
        cancel.setVisibility(View.VISIBLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        worker.execute(() -> {
            Outcome outcome;
            try { outcome = task.run(); }
            catch (Exception error) {
                installer.disconnect();
                installer.recordFailure(action, error);
                outcome = new Outcome(false, action.equals("Installation") ? "✗ NOT INSTALLED" : "✗ " + action.toUpperCase(java.util.Locale.ROOT) + " FAILED",
                        OperationFailure.describe(action, error));
                if (action.equals("APK selection")) {
                    runOnUiThread(() -> { if (!isDestroyed()) selection.setText(R.string.apk_load_failed); });
                }
            }
            Outcome finished = outcome;
            runOnUiThread(() -> {
                if (isDestroyed()) return;
                busy = false;
                for (View view : controls) view.setEnabled(true);
                progress.setVisibility(View.GONE); cancel.setVisibility(View.GONE);
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (finished == null) { status.setText(selectedApk != null ? "Ready. Tap INSTALL TO WATCH." : ""); return; }
                status.setText(finished.ok ? "Done." : "Something went wrong — details below.");
                result.setText(finished.title); result.setTextColor(finished.ok ? GREEN : RED); result.setVisibility(View.VISIBLE);
                resultDetail.setText(finished.detail); resultDetail.setVisibility(View.VISIBLE);
                copyError.setVisibility(finished.ok ? View.GONE : View.VISIBLE);
            });
        });
    }

    private void heading(String name) {
        TextView view = text(page, name, 15, CYAN);
        view.setPadding(0, dp(18), 0, dp(4));
    }
    private EditText field(LinearLayout parent, String label, String hint, int inputType) {
        text(parent, label, 12, CYAN);
        EditText edit = new EditText(this); edit.setHint(hint); edit.setHintTextColor(Color.rgb(99, 134, 145)); edit.setTextColor(PALE);
        edit.setTypeface(Typeface.MONOSPACE); edit.setTextSize(15); edit.setInputType(inputType); edit.setSingleLine(true); edit.setMinHeight(dp(48));
        parent.addView(edit); controls.add(edit); return edit;
    }
    private Button button(LinearLayout parent, String label, int colour, Action action) {
        Button button = new Button(this); button.setText(label); button.setTypeface(Typeface.MONOSPACE); button.setTextColor(colour); button.setMinHeight(dp(52));
        parent.addView(button); controls.add(button);
        button.setOnClickListener(view -> { try { action.run(); } catch (Exception error) { status.setText(Text.clean(error.getMessage())); } });
        return button;
    }
    private TextView text(LinearLayout parent, String value, int size, int color) {
        TextView view = new TextView(this); view.setText(value); view.setTextColor(color); view.setTypeface(Typeface.MONOSPACE); view.setTextSize(size); view.setPadding(0, dp(6), 0, dp(10));
        parent.addView(view); return view;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    /** Close sockets and the private APK copy when Android destroys the screen. */
    @Override protected void onDestroy() {
        installer.disconnect(); worker.shutdownNow();
        FaceApk apk = selectedApk; if (apk != null) apk.close();
        super.onDestroy();
    }
    private interface Action { void run() throws Exception; }
    private interface Task { Outcome run() throws Exception; }
}
