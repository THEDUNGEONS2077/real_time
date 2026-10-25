/** Phone UI: four numbered steps (connect, install, test, report) and a report the user reviews before copying. */
package com.thedungeons2077.realtime.diagnostics;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.PersistableBundle;
import android.text.InputType;
import android.view.View;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A native screen with no embedded browser, remote content or background service. */
public final class MainActivity extends Activity {
    private static final int PICK_APK = 41;
    private static final int BACKGROUND = Color.rgb(5, 11, 18), PALE = Color.rgb(207, 239, 247), CYAN = Color.rgb(111, 208, 230), AMBER = Color.rgb(244, 185, 66);
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final List<View> controls = new ArrayList<>();
    private LinearLayout page;
    private TextView status, report, selection;
    private ProgressBar progressBar;
    private Button cancel, connectTitle, installTitle, testTitle;
    /** Each field's caption, so a field and its label hide together. */
    private final java.util.Map<View, TextView> labels = new java.util.HashMap<>();
    private volatile FaceApk selectedApk;
    private EditText host, pairPort, connectionPort, code, renderer, layer, otherFace;
    private Spinner face, palette, preset, font, clockSize, glow, motionSpeed, motionStyle;
    private CheckBox aod;
    private Diagnostics diagnostics;
    private boolean busy;

    /**
     * Four numbered steps, top to bottom: CONNECT → INSTALL → TEST → REPORT.
     * The smoothness test is the one primary action; the older tests live under MORE TESTS.
     * Pairing codes are never saved; host and port are remembered for one-tap reconnects.
     */
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        diagnostics = new Diagnostics(this, message -> runOnUiThread(() -> { if (!isDestroyed()) status.setText(message); }));
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BACKGROUND);
        page = new LinearLayout(this); page.setOrientation(LinearLayout.VERTICAL); page.setPadding(dp(22), dp(16), dp(22), dp(28));
        scroll.addView(page);
        // Target-36 edge-to-edge: controls and copy actions stay clear of system bars and the keyboard.
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom); return insets;
        });
        setContentView(scroll);
        var preferences = getPreferences(MODE_PRIVATE);
        boolean paired = preferences.getBoolean("paired", false);

        text("<real_time>\nWATCH HELPER", 24, CYAN);
        text("Results stay on this phone until you copy them. No analytics, no uploads.", 12, PALE);
        // Status line, progress bar and cancel button: always visible above the steps.
        status = text(diagnostics.batteryPending() ? "Battery test pending. Reconnect and finish it under MORE TESTS." : paired ? "Ready. Tap CONNECT, then run a test." : "Start with step 1: pair once with the watch.", 14, AMBER);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setIndeterminate(true); progressBar.setVisibility(View.GONE); page.addView(progressBar);
        cancel = new Button(this); cancel.setText("CANCEL"); cancel.setTypeface(Typeface.MONOSPACE); cancel.setTextColor(AMBER); cancel.setVisibility(View.GONE);
        cancel.setOnClickListener(view -> { diagnostics.disconnect(); status.setText("Cancelling…"); });
        page.addView(cancel);

        // 1 · CONNECT — the address and port from the watch's Wireless debugging screen.
        connectTitle = new Button(this);
        LinearLayout connection = section(connectTitle, "1 · CONNECT", true);
        host = field(connection, "WATCH WI-FI ADDRESS", "192.168.1.20", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        host.setText(preferences.getString("host", ""));
        connectionPort = field(connection, "CONNECTION PORT", "Shown under Wireless debugging", InputType.TYPE_CLASS_NUMBER);
        connectionPort.setText(preferences.getString("port", ""));
        button(connection, "CONNECT", () -> {
            LocalEndpoint endpoint = currentEndpoint();
            run("Connection", () -> {
                diagnostics.checkConnection(endpoint);
                runOnUiThread(() -> mark(connectTitle, "1 · CONNECT"));
                return "Connected. Install a face (step 2) or run the smoothness test (step 3).";
            });
        });
        text(connection, "Watch: Settings › Developer options › Wireless debugging. The port changes when debugging is turned back on.", 12, PALE);
        // First-time pairing folds away once it has worked.
        LinearLayout pairing = section(connection, paired ? "PAIR AGAIN (ONLY IF CONNECT FAILS)" : "PAIR (FIRST TIME ONLY)", !paired);
        pairPort = field(pairing, "PAIRING PORT", "From Pair new device", InputType.TYPE_CLASS_NUMBER);
        code = field(pairing, "PAIRING CODE", "Six digits", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        code.setSaveEnabled(false);
        button(pairing, "PAIR WITH WATCH", () -> {
            LocalEndpoint endpoint = new LocalEndpoint(host.getText().toString(), pairPort.getText().toString());
            String pairingCode = LocalEndpoint.pairingCode(code.getText().toString());
            getPreferences(MODE_PRIVATE).edit().putString("host", endpoint.host).apply();
            code.setText("");
            run("Pairing", () -> {
                diagnostics.pair(endpoint, pairingCode);
                getPreferences(MODE_PRIVATE).edit().putBoolean("paired", true).apply();
                return "Paired. Enter the connection port above and tap CONNECT.";
            });
        });
        text(pairing, "Phone and watch must share a Wi-Fi network. Only private addresses are accepted.", 12, PALE);

        // 2 · INSTALL — a face APK downloaded to this phone.
        installTitle = new Button(this);
        LinearLayout install = section(installTitle, "2 · INSTALL A FACE", false);
        button(install, "CHOOSE FACE APK", () -> {
            Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE)
                    .putExtra(Intent.EXTRA_LOCAL_ONLY, true);
            startActivityForResult(picker, PICK_APK);
        });
        selection = text(install, "No APK selected.", 12, PALE);
        button(install, "INSTALL TO WATCH", () -> {
            FaceApk apk = selectedApk;
            if (apk == null) throw new IllegalStateException("Choose a real_time watch-face APK first.");
            LocalEndpoint endpoint = currentEndpoint();
            run("Installation", () -> {
                diagnostics.install(endpoint, apk);
                runOnUiThread(() -> mark(installTitle, "2 · INSTALL A FACE"));
                return FaceCatalog.name(apk.packageName) + " installed. On the watch, long-press the face, then add " + FaceCatalog.name(apk.packageName) + ".";
            });
        });
        text(install, "Updates keep your saved face settings. Installing is blocked during a battery test.", 12, PALE);

        // 3 · TEST — record what the watch editor is set to, then one tap.
        testTitle = new Button(this);
        LinearLayout tests = section(testTitle, "3 · TEST SMOOTHNESS", true);
        text(tests, "Show the face on the watch, then tap RUN. Pick the same settings as the watch editor so the report is labelled correctly; this does not change the watch.", 12, PALE);
        face = spinner(tests, "FACE", new String[]{"REDLINE", "HALO", "STOCK / OTHER"});
        otherFace = field(tests, "OTHER FACE NAME", "Only for a stock or other face", InputType.TYPE_CLASS_TEXT);
        palette = spinner(tests, "COLOURS", FaceCatalog.palettes("REDLINE"));
        font = spinner(tests, "CLOCK FONT", FaceCatalog.fonts("REDLINE"));
        clockSize = spinner(tests, "CLOCK SIZE", FaceCatalog.clockSizes("REDLINE"));
        glow = spinner(tests, "CLOCK GLOW", FaceCatalog.glows("REDLINE"));
        motionSpeed = spinner(tests, "MOTION SPEED", new String[]{"SLOW", "STANDARD", "FAST", "STILL"});
        motionStyle = spinner(tests, "ROTATION STYLE", new String[]{"SMOOTH", "DYNAMIC"});
        preset = spinner(tests, "EFFECTS", FaceCatalog.effectPresets("REDLINE"));
        face.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                String selected = selectedFace();
                setChoices(palette, FaceCatalog.palettes(selected));
                setChoices(preset, FaceCatalog.effectPresets(selected));
                // Only REDLINE has font and motion choices; hide what does not apply.
                int redline = "REDLINE".equals(selected) ? View.VISIBLE : View.GONE;
                for (Spinner s : new Spinner[]{font, clockSize, glow, motionSpeed, motionStyle}) { s.setVisibility(redline); labels.get(s).setVisibility(redline); }
                int other = position == 2 ? View.VISIBLE : View.GONE;
                otherFace.setVisibility(other); labels.get(otherFace).setVisibility(other);
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) { }
        });
        button(tests, "RUN SMOOTHNESS TEST (20 s)", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run("Smoothness", () -> {
                diagnostics.smoothness(endpoint, settings);
                runOnUiThread(() -> mark(testTitle, "3 · TEST SMOOTHNESS"));
                return "Done. The result is in step 4: tap COPY REPORT and paste it into the chat.";
            });
        });

        // MORE TESTS — the detailed trace, battery interval and renderer logs.
        LinearLayout more = section(tests, "MORE TESTS", false);
        aod = new CheckBox(this); aod.setText(R.string.aod_enabled); aod.setTextColor(PALE); aod.setTypeface(Typeface.MONOSPACE); more.addView(aod); controls.add(aod);
        text(more, "Detailed trace: 30 s Perfetto recording with CPU by process. Needs a 1-minute screen timeout.", 12, PALE);
        button(more, "RUN 30-SECOND TRACE", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run(() -> { diagnostics.performance(endpoint, settings); return "Trace analysed. Copy the report in step 4."; });
        });
        text(more, "Battery: start unplugged, turn debugging off and wear normally for about 24 hours. Reconnect and finish before charging.", 12, PALE);
        button(more, "START BATTERY TEST", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run(() -> { diagnostics.startBattery(endpoint, settings); return "Start saved. Turn wireless debugging off and wear normally. Finish here before charging."; });
        });
        button(more, "FINISH BATTERY TEST", () -> {
            LocalEndpoint endpoint = currentEndpoint();
            run(() -> { diagnostics.finishBattery(endpoint); return "Battery report ready. Copy it in step 4."; });
        });
        button(more, "DISCARD PENDING BATTERY TEST", () -> new AlertDialog.Builder(this).setMessage("Discard the saved start? This does not change the watch.")
                .setNegativeButton("KEEP", null).setPositiveButton("DISCARD", (dialog, which) -> run(() -> { diagnostics.discardBattery(); return "Pending test discarded."; })).show());
        text(more, "If a face shows blank or white, reproduce it once, then collect renderer logs.", 12, PALE);
        button(more, "COLLECT RENDERER DIAGNOSTICS", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run("Renderer diagnostics", () -> { diagnostics.rendererDiagnostics(endpoint, settings); return "Renderer report ready. Copy it in step 4."; });
        });
        renderer = field(more, "TRACE: RENDERER PROCESS (OPTIONAL)", "Exact process name from a trace report", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        layer = field(more, "TRACE: FRAME LAYER (OPTIONAL)", "Exact surface name from a trace report", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        button(more, "REANALYSE LAST TRACE", () -> {
            String process = renderer.getText().toString(), surface = layer.getText().toString();
            run(() -> { diagnostics.reanalyze(process, surface); return "Last trace reanalysed on the phone."; });
        });

        // 4 · REPORT — review, then copy.
        LinearLayout results = section(new Button(this), "4 · REPORT", true);
        button(results, "COPY REPORT", this::copy);
        report = text(results, diagnostics.latestReport().isEmpty() ? "No report yet." : diagnostics.latestReport(), 12, PALE);
        report.setTextIsSelectable(true);
        text(results, "Only this summary is copied: no raw history, addresses or pairing keys.", 12, PALE);
        button(results, "DELETE LOCAL REPORTS", () -> new AlertDialog.Builder(this).setMessage("Delete saved reports and raw captures from this phone? Pairing is kept.")
                .setNegativeButton("KEEP", null).setPositiveButton("DELETE", (dialog, which) -> run(() -> { diagnostics.clearReports(); return "Local reports deleted."; })).show());
        button(page, "THIRD-PARTY NOTICES", () -> {
            try (var input = getAssets().open("third-party.txt")) {
                new AlertDialog.Builder(this).setTitle("Third-party components").setMessage(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
                        .setPositiveButton("CLOSE", null).show();
            }
        });
    }

    /** The face chosen in step 3, as a catalogue name. */
    private String selectedFace() {
        int position = face.getSelectedItemPosition();
        return position == 0 ? "REDLINE" : position == 1 ? "HALO" : "STOCK";
    }

    /** Show a completed step with a check mark. */
    private void mark(Button title, String name) { title.setText(name + "  ✓"); }

    /** Stage a picker-granted document off the UI thread; no storage permission or persistent grant. */
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_APK || result != RESULT_OK || data == null || data.getData() == null) return;
        android.net.Uri document = data.getData();
        FaceApk previous = selectedApk; selectedApk = null;
        if (previous != null) previous.close();
        selection.setText(R.string.checking_apk);
        run("APK selection", () -> {
            FaceApk apk = FaceApk.select(this, document);
            if (isDestroyed()) { apk.close(); throw new java.io.IOException("Screen closed during APK selection."); }
            selectedApk = apk;
            runOnUiThread(() -> { if (!isDestroyed()) selection.setText(apk.summary()); });
            return FaceCatalog.name(apk.packageName) + " APK ready. Review its version, then tap INSTALL TO WATCH.";
        });
    }

    private LocalEndpoint currentEndpoint() {
        LocalEndpoint endpoint = new LocalEndpoint(host.getText().toString(), connectionPort.getText().toString());
        getPreferences(MODE_PRIVATE).edit().putString("host", endpoint.host).putString("port", String.valueOf(endpoint.port)).apply();
        return endpoint;
    }
    /** The user's declaration of the watch editor settings, recorded in the report. */
    private JSONObject setup() throws Exception {
        JSONObject result = new JSONObject();
        String selected = selectedFace();
        String name = "STOCK".equals(selected) ? otherFace.getText().toString().trim() : selected;
        if (name.isBlank()) throw new IllegalArgumentException("Type the name of the stock or other face being tested.");
        result.put("face", name).put("palette", palette.getSelectedItem().toString()).put("preset", preset.getSelectedItem().toString()).put("aod", aod.isChecked());
        if ("REDLINE".equals(selected)) {
            result.put("clockFont", font.getSelectedItem().toString()).put("clockSize", clockSize.getSelectedItem().toString()).put("glow", glow.getSelectedItem().toString());
            result.put("motionSpeed", motionSpeed.getSelectedItem().toString()).put("motionStyle", motionStyle.getSelectedItem().toString());
        }
        result.put("rendererProcess", renderer.getText().toString().trim()).put("rendererLayer", layer.getText().toString().trim());
        // Preset 0 = all on, 1 = all off, 2+ = all on except one effect.
        JSONObject effects = new JSONObject();
        String[] ids = FaceCatalog.effects(name);
        int choice = preset.getSelectedItemPosition();
        for (int i = 0; i < ids.length; i++) effects.put(ids[i], !"STOCK".equals(selected) && choice != 1 && choice != i + 2);
        return result.put("effects", effects);
    }
    private void copy() {
        String text = diagnostics.latestReport();
        if (text.isEmpty()) throw new IllegalStateException("Run a connection check, installation or test before copying a report.");
        ClipboardManager clipboard = getSystemService(ClipboardManager.class);
        ClipData clip = ClipData.newPlainText("real_time diagnostics", text);
        PersistableBundle extras = new PersistableBundle(); extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true); clip.getDescription().setExtras(extras);
        clipboard.setPrimaryClip(clip);
        status.setText(R.string.copied);
    }
    private void run(Task task) { run("Diagnostics", task); }
    private void run(String action, Task task) {
        if (busy) return;
        busy = true; for (View view : controls) view.setEnabled(false);
        // Progress and CANCEL stay usable while every other control is disabled.
        progressBar.setVisibility(View.VISIBLE); cancel.setVisibility(View.VISIBLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        worker.execute(() -> {
            String message;
            try { message = task.run(); }
            catch (Exception error) {
                diagnostics.disconnect(); message = OperationFailure.describe(action, error); diagnostics.recordFailure(action, error);
                if (action.equals("APK selection")) runOnUiThread(() -> {
                    if (!isDestroyed()) selection.setText(getString(R.string.apk_load_failed, Measurements.clean(error.getMessage())));
                });
            }
            String finalMessage = message;
            runOnUiThread(() -> {
                if (isDestroyed()) return;
                busy = false; for (View view : controls) view.setEnabled(true);
                progressBar.setVisibility(View.GONE); cancel.setVisibility(View.GONE);
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                status.setText(finalMessage);
                String current = diagnostics.latestReport(); report.setText(current.isEmpty() ? "No completed report yet." : current);
            });
        });
    }
    /** A numbered top-level step whose title toggles its content. */
    private LinearLayout section(Button title, String name, boolean expanded) { return section(page, title, name, expanded, CYAN); }
    /** A folded sub-section inside a step. */
    private LinearLayout section(LinearLayout parent, String name, boolean expanded) { return section(parent, new Button(this), name, expanded, AMBER); }
    private LinearLayout section(LinearLayout parent, Button title, String name, boolean expanded, int colour) {
        title.setText(name); title.setTextColor(colour); title.setTypeface(Typeface.MONOSPACE); parent.addView(title);
        LinearLayout content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(0, dp(8), 0, dp(16)); content.setVisibility(expanded ? View.VISIBLE : View.GONE); parent.addView(content);
        title.setOnClickListener(view -> content.setVisibility(content.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        return content;
    }
    private EditText field(LinearLayout parent, String label, String hint, int inputType) {
        TextView caption = text(parent, label, 12, CYAN); EditText edit = new EditText(this); labels.put(edit, caption); edit.setHint(hint); edit.setHintTextColor(Color.rgb(99, 134, 145)); edit.setTextColor(PALE);
        edit.setTypeface(Typeface.MONOSPACE); edit.setTextSize(15); edit.setInputType(inputType); edit.setSingleLine(true); edit.setMinHeight(dp(48)); parent.addView(edit); controls.add(edit); return edit;
    }
    private Spinner spinner(LinearLayout parent, String label, String[] items) {
        TextView caption = text(parent, label, 12, CYAN); Spinner spinner = new Spinner(this); labels.put(spinner, caption);
        setChoices(spinner, items); spinner.setMinimumHeight(dp(48)); parent.addView(spinner); controls.add(spinner); return spinner;
    }
    private void setChoices(Spinner spinner, String[] items) {
        var adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, items) {
            @Override public View getView(int position, View convert, android.view.ViewGroup parentView) {
                TextView view = (TextView) super.getView(position, convert, parentView); view.setTextColor(PALE); view.setTypeface(Typeface.MONOSPACE); view.setTextSize(15); return view;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item); spinner.setAdapter(adapter);
    }
    private void button(LinearLayout parent, String label, Action action) {
        Button button = new Button(this); button.setText(label); button.setTypeface(Typeface.MONOSPACE); button.setTextColor(AMBER); button.setMinHeight(dp(48)); parent.addView(button); controls.add(button);
        button.setOnClickListener(view -> { try { action.run(); } catch (Exception error) { status.setText(Measurements.clean(error.getMessage())); } });
    }
    private TextView text(String value, int size, int color) { return text(page, value, size, color); }
    private TextView text(LinearLayout parent, String value, int size, int color) {
        TextView view = new TextView(this); view.setText(value); view.setTextColor(color); view.setTypeface(Typeface.MONOSPACE); view.setTextSize(size); view.setPadding(0, dp(6), 0, dp(10)); parent.addView(view); return view;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    /** Close active work and sockets when Android destroys the screen. Saved battery starts survive. */
    @Override protected void onDestroy() {
        diagnostics.disconnect(); worker.shutdownNow();
        FaceApk apk = selectedApk; if (apk != null) apk.close();
        super.onDestroy();
    }
    private interface Action { void run() throws Exception; }
    private interface Task { String run() throws Exception; }
}
