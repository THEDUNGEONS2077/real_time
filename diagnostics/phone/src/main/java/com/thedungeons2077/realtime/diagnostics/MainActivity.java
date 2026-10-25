/** Phone UI: explicit pairing, test actions and a report the user can review before copying. */
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
    private volatile FaceApk selectedApk;
    private EditText host, pairPort, connectionPort, code, renderer, layer, otherFace;
    private Spinner face, palette, preset, motionSpeed, motionStyle;
    private CheckBox aod;
    private Diagnostics diagnostics;
    private boolean busy;

    /** Restore only local form settings; pairing codes are never saved. */
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
        text("<real_time>\nDIAGNOSTICS", 24, CYAN);
        text("INSTALL · TEST · REVIEW · COPY\nNo analytics or automatic uploads. Results stay on this phone until you copy them.", 13, PALE);
        status = text(diagnostics.batteryPending() ? "Battery test pending. Reconnect to finish it." : "Ready. Pair once, then install or test.", 14, AMBER);

        LinearLayout connection = section("WATCH CONNECTION", true);
        var preferences = getPreferences(MODE_PRIVATE);
        host = field(connection, "WATCH WI-FI ADDRESS", "192.168.1.20", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        host.setText(preferences.getString("host", ""));
        pairPort = field(connection, "PAIRING PORT", "From Pair new device", InputType.TYPE_CLASS_NUMBER);
        code = field(connection, "PAIRING CODE", "Six digits", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        code.setSaveEnabled(false);
        connectionPort = field(connection, "CONNECTION PORT", "From the main Wireless debugging screen", InputType.TYPE_CLASS_NUMBER);
        connectionPort.setText(preferences.getString("port", ""));
        text(connection, "Phone and watch need the same Wi-Fi network. Pairing and connection ports differ. The connection port can change when debugging is re-enabled.", 12, PALE);
        button(connection, "PAIR WITH WATCH", () -> {
            LocalEndpoint endpoint = new LocalEndpoint(host.getText().toString(), pairPort.getText().toString());
            String pairingCode = LocalEndpoint.pairingCode(code.getText().toString());
            getPreferences(MODE_PRIVATE).edit().putString("host", endpoint.host).apply();
            code.setText("");
            run("Pairing", () -> { diagnostics.pair(endpoint, pairingCode); return "Paired. Enter the connection port and tap CHECK CONNECTION. This pairing also works for installation and tests."; });
        });
        button(connection, "CHECK CONNECTION", () -> {
            LocalEndpoint endpoint = currentEndpoint();
            run("Connection", () -> { diagnostics.checkConnection(endpoint); return "Connection verified. Choose a face APK below, then tap INSTALL TO WATCH."; });
        });
        text(connection, "The Android network permission is used only to reach the private watch address you enter. No public addresses or hostnames are accepted.", 12, PALE);

        LinearLayout install = section("INSTALL WATCH FACE", true);
        text(install, "Download the HALO or REDLINE watch-face APK onto this phone. Choose it here, review the face/version, then install using the same watch connection. The diagnostics phone APK belongs on the phone.", 12, PALE);
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
            run("Installation", () -> { diagnostics.install(endpoint, apk); return FaceCatalog.name(apk.packageName) + " installed and version verified. On the watch, long-press the current face, add a face, then choose " + FaceCatalog.name(apk.packageName) + ". Turn wireless debugging off when finished."; });
        });
        text(install, "Compatible updates preserve existing face data. Installation is blocked during a battery test. Interrupted installs need a check of the watch face list before retrying.", 12, PALE);

        LinearLayout setup = section("TEST SETUP", true);
        face = spinner(setup, "FACE", new String[]{"HALO", "REDLINE", "STOCK / OTHER"});
        otherFace = field(setup, "OTHER FACE NAME", "Fill this in when testing a stock or other face", InputType.TYPE_CLASS_TEXT);
        palette = spinner(setup, "PALETTE", new String[]{"REFERENCE", "PHOSPHOR", "ICE", "STOCK"});
        motionSpeed = spinner(setup, "REDLINE MOTION SPEED (0.2.0+)", new String[]{"SLOW", "STANDARD", "FAST", "STILL", "UNAVAILABLE / OLDER VERSION"});
        motionStyle = spinner(setup, "REDLINE ROTATION STYLE (0.2.0+)", new String[]{"SMOOTH", "DYNAMIC", "UNAVAILABLE / OLDER VERSION"});
        preset = spinner(setup, "EFFECTS", FaceCatalog.effectPresets("HALO"));
        face.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                String selected = position < 2 ? (position == 0 ? "HALO" : "REDLINE") : "STOCK";
                setChoices(palette, FaceCatalog.palettes(selected));
                setChoices(preset, FaceCatalog.effectPresets(selected));
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) { }
        });
        aod = new CheckBox(this); aod.setText(R.string.aod_enabled); aod.setTextColor(PALE); aod.setTypeface(Typeface.MONOSPACE); setup.addView(aod); controls.add(aod);
        text(setup, "Match this setup in the watch-face editor before starting. These controls label the experiment; they do not change the watch face.", 12, PALE);

        LinearLayout tests = section("TESTS", true);
        text(tests, "If applying or previewing a face fails, reproduce it once, then collect renderer diagnostics promptly. This reads recent renderer warnings/errors without changing the watch face.", 12, PALE);
        button(tests, "COLLECT RENDERER DIAGNOSTICS", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run("Renderer diagnostics", () -> { diagnostics.rendererDiagnostics(endpoint, settings); return "Renderer report ready. Review it, then tap COPY DIAGNOSTICS. Turn wireless debugging off when finished."; });
        });
        text(tests, "Performance: set the watch screen timeout to one minute and keep the face visible for the recording. Repeat each configuration three times.", 12, PALE);
        button(tests, "RUN 30-SECOND PERFORMANCE TEST", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run(() -> { diagnostics.performance(endpoint, settings); return "Test complete. Review the report, then copy it. Turn wireless debugging off."; });
        });
        text(tests, "Battery: start unplugged, turn debugging off, and wear normally for about 24 hours. Before charging, reconnect and finish. No logger runs between the endpoints.", 12, PALE);
        button(tests, "START BATTERY TEST", () -> {
            LocalEndpoint endpoint = currentEndpoint(); JSONObject settings = setup();
            run(() -> { diagnostics.startBattery(endpoint, settings); return "Start saved. Turn wireless debugging off and wear normally. Reconnect here and finish before charging."; });
        });
        button(tests, "FINISH BATTERY TEST", () -> {
            LocalEndpoint endpoint = currentEndpoint();
            run(() -> { diagnostics.finishBattery(endpoint); return "Battery report ready. Review it, then copy. Turn wireless debugging off."; });
        });
        button(tests, "DISCARD PENDING BATTERY TEST", () -> new AlertDialog.Builder(this).setMessage("Discard the saved start? This does not change the watch.")
                .setNegativeButton("KEEP", null).setPositiveButton("DISCARD", (dialog, which) -> run(() -> { diagnostics.discardBattery(); return "Pending test discarded."; })).show());

        LinearLayout advanced = section("OPTIONAL RENDERER SELECTION", false);
        text(advanced, "The first report lists available processes and surfaces. Use exact names only after identifying the watch-face renderer; unknown attribution stays unavailable.", 12, PALE);
        renderer = field(advanced, "RENDERER PROCESS", "Optional exact process name", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        layer = field(advanced, "FRAME LAYER", "Optional exact surface name", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        button(advanced, "REANALYZE SAVED TEST", () -> {
            String process = renderer.getText().toString(), surface = layer.getText().toString();
            run(() -> { diagnostics.reanalyze(process, surface); return "Saved trace reanalyzed locally. No watch connection was needed."; });
        });

        LinearLayout results = section("REPORT", true);
        button(results, "COPY DIAGNOSTICS", this::copy);
        text(results, "Only this readable summary is copied. Raw battery history, addresses and pairing keys are not included. Paste it into the chat when you are ready.", 12, PALE);
        report = text(results, diagnostics.latestReport().isEmpty() ? "No completed report yet." : diagnostics.latestReport(), 12, PALE);
        report.setTextIsSelectable(true);
        button(results, "DELETE LOCAL REPORTS", () -> new AlertDialog.Builder(this).setMessage("Delete saved reports and raw captures from this phone? Pairing is retained.")
                .setNegativeButton("KEEP", null).setPositiveButton("DELETE", (dialog, which) -> run(() -> { diagnostics.clearReports(); return "Local reports deleted."; })).show());
        text("ONE WATCH PAIRING FOR INSTALLATION AND DIAGNOSTICS\nNo additional watch app is needed.", 12, CYAN);
        button(page, "THIRD-PARTY NOTICES", () -> {
            try (var input = getAssets().open("third-party.txt")) {
                new AlertDialog.Builder(this).setTitle("Third-party components").setMessage(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
                        .setPositiveButton("CLOSE", null).show();
            }
        });
    }

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
    private JSONObject setup() throws Exception {
        JSONObject result = new JSONObject();
        String selectedFace = face.getSelectedItemPosition() < 2 ? face.getSelectedItem().toString() : otherFace.getText().toString().trim();
        if (selectedFace.isBlank()) throw new IllegalArgumentException("Record the name of the stock or other face being tested.");
        result.put("face", selectedFace).put("palette", palette.getSelectedItem().toString()).put("preset", preset.getSelectedItem().toString()).put("aod", aod.isChecked());
        if (face.getSelectedItemPosition() == 1) {
            String speed = motionSpeed.getSelectedItem().toString(), style = motionStyle.getSelectedItem().toString();
            if (!speed.startsWith("UNAVAILABLE")) result.put("motionSpeed", speed);
            if (!style.startsWith("UNAVAILABLE")) result.put("motionStyle", style);
        }
        result.put("rendererProcess", renderer.getText().toString().trim()).put("rendererLayer", layer.getText().toString().trim());
        JSONObject effects = new JSONObject();
        String[] effectIds = FaceCatalog.effects(selectedFace);
        for (int i = 0; i < effectIds.length; i++) effects.put(effectIds[i], face.getSelectedItemPosition() < 2 && preset.getSelectedItemPosition() != 1 && preset.getSelectedItemPosition() != i + 2);
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
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                status.setText(finalMessage);
                String current = diagnostics.latestReport(); report.setText(current.isEmpty() ? "No completed report yet." : current);
            });
        });
    }
    private LinearLayout section(String name, boolean expanded) {
        Button title = new Button(this); title.setText(name); title.setTextColor(CYAN); title.setTypeface(Typeface.MONOSPACE); page.addView(title);
        LinearLayout content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(0, dp(8), 0, dp(16)); content.setVisibility(expanded ? View.VISIBLE : View.GONE); page.addView(content);
        title.setOnClickListener(view -> content.setVisibility(content.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        return content;
    }
    private EditText field(LinearLayout parent, String label, String hint, int inputType) {
        text(parent, label, 12, CYAN); EditText edit = new EditText(this); edit.setHint(hint); edit.setHintTextColor(Color.rgb(99, 134, 145)); edit.setTextColor(PALE);
        edit.setTypeface(Typeface.MONOSPACE); edit.setTextSize(15); edit.setInputType(inputType); edit.setSingleLine(true); edit.setMinHeight(dp(48)); parent.addView(edit); controls.add(edit); return edit;
    }
    private Spinner spinner(LinearLayout parent, String label, String[] items) {
        text(parent, label, 12, CYAN); Spinner spinner = new Spinner(this);
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
