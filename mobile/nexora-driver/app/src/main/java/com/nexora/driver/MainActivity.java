package com.nexora.driver;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int GREEN = Color.rgb(4, 120, 87);
    private static final int GREEN_DARK = Color.rgb(6, 78, 59);
    private static final int CYAN = Color.rgb(8, 145, 178);
    private static final int SLATE = Color.rgb(15, 23, 42);
    private static final int MUTED = Color.rgb(100, 116, 139);
    private static final int SURFACE = Color.rgb(248, 250, 252);
    private static final int LINE = Color.rgb(203, 213, 225);

    private EditText serverUrl;
    private EditText token;
    private EditText plate;
    private EditText driver;
    private EditText orderId;
    private TextView status;
    private TextView routeTitle;
    private CheckBox consent;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("nexora-driver", Context.MODE_PRIVATE);
        getWindow().setStatusBarColor(GREEN_DARK);
        getWindow().setNavigationBarColor(Color.rgb(226, 232, 240));

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(0, 0, 0, dp(28));
        root.setBackgroundColor(Color.rgb(241, 245, 249));

        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setPadding(dp(24), dp(28), dp(24), dp(30));
        hero.setBackground(gradient(GREEN_DARK, GREEN));
        root.addView(hero, new LinearLayout.LayoutParams(-1, -2));

        TextView brand = text("NEXORA", 11, Color.rgb(167, 243, 208), true);
        brand.setLetterSpacing(0.14f);
        hero.addView(brand);

        routeTitle = text("Driver GPS", 34, Color.WHITE, true);
        routeTitle.setPadding(0, dp(8), 0, 0);
        hero.addView(routeTitle);

        TextView subtitle = text("Transportes Gran Bretana / seguimiento en vivo", 15, Color.rgb(220, 252, 231), false);
        subtitle.setPadding(0, dp(6), 0, 0);
        hero.addView(subtitle);

        LinearLayout statusCard = card();
        statusCard.setPadding(dp(18), dp(16), dp(18), dp(16));
        statusCard.addView(pill("LISTO PARA OPERAR", GREEN, Color.WHITE));
        status = text("Configura la ruta e inicia el seguimiento.", 17, SLATE, true);
        status.setPadding(0, dp(12), 0, 0);
        statusCard.addView(status);
        TextView hint = text("La torre de control recibira puntos GPS y dibujara el recorrido completo.", 13, MUTED, false);
        hint.setPadding(0, dp(6), 0, 0);
        statusCard.addView(hint);
        statusCard.addView(metricRow());
        root.addView(statusCard, cardParams(dp(20), dp(-18), dp(20), 0));

        plate = field("TRK-482");
        driver = field("Conductor demo");
        orderId = field("OT-1048");
        serverUrl = field("https://nexoraenterprice.netlify.app/api/transport/gps");
        token = field("nexora-demo-gps-2026");
        token.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);

        plate.setText(prefs.getString("plate", "TRK-482"));
        driver.setText(prefs.getString("driver", "Conductor demo"));
        orderId.setText(prefs.getString("orderId", "OT-1048"));
        serverUrl.setText(prefs.getString("serverUrl", "https://nexoraenterprice.netlify.app/api/transport/gps"));
        token.setText(prefs.getString("token", "nexora-demo-gps-2026"));
        updateRouteTitle();
        plate.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence value, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence value, int start, int before, int count) {
                updateRouteTitle();
            }

            @Override
            public void afterTextChanged(Editable editable) {
            }
        });

        LinearLayout routeCard = card();
        routeCard.addView(sectionTitle("Operacion"));
        routeCard.addView(labeledField("Vehiculo", plate));
        routeCard.addView(labeledField("Conductor", driver));
        routeCard.addView(labeledField("Orden / ruta", orderId));
        root.addView(routeCard, cardParams(dp(20), dp(16), dp(20), 0));

        LinearLayout consentCard = card();
        consentCard.addView(sectionTitle("Privacidad y permisos"));
        TextView privacy = text("Nexora usara la ubicacion del dispositivo solo durante una ruta activa para mostrar posicion, recorrido y ultima senal en torre de control.", 13, Color.rgb(51, 65, 85), false);
        privacy.setLineSpacing(3, 1.05f);
        consentCard.addView(privacy);
        consent = new CheckBox(this);
        consent.setText("Acepto activar GPS para esta ruta");
        consent.setTextSize(14);
        consent.setTextColor(SLATE);
        consent.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        consent.setPadding(0, dp(10), 0, 0);
        consent.setChecked(prefs.getBoolean("consent", false));
        consentCard.addView(consent);
        root.addView(consentCard, cardParams(dp(20), dp(16), dp(20), 0));

        LinearLayout actionsCard = card();
        actionsCard.addView(sectionTitle("Control de ruta"));
        Button start = button("Iniciar seguimiento", GREEN, Color.WHITE);
        start.setOnClickListener(v -> startTracking());
        actionsCard.addView(start, blockParams(dp(8)));

        Button stop = button("Detener seguimiento", Color.rgb(226, 232, 240), SLATE);
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, TrackingService.class));
            status.setText("Seguimiento detenido.");
        });
        actionsCard.addView(stop, blockParams(dp(10)));

        Button settings = button("Permisos y bateria", SLATE, Color.WHITE);
        settings.setOnClickListener(v -> openAppSettings());
        actionsCard.addView(settings, blockParams(dp(10)));
        root.addView(actionsCard, cardParams(dp(20), dp(16), dp(20), 0));

        LinearLayout connectionCard = card();
        connectionCard.addView(sectionTitle("Conexion segura"));
        connectionCard.addView(labeledField("Servidor", serverUrl));
        connectionCard.addView(labeledField("Token", token));
        TextView connectionHint = text("Estos datos vienen preconfigurados para la demo. En produccion se reemplazan por login del conductor.", 12, MUTED, false);
        connectionHint.setPadding(0, dp(12), 0, 0);
        connectionCard.addView(connectionHint);
        root.addView(connectionCard, cardParams(dp(20), dp(16), dp(20), 0));

        TextView footer = text("Version demo segura para prueba directa. Mantener la notificacion activa durante la ruta.", 12, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(dp(24), dp(20), dp(24), 0);
        root.addView(footer);

        scrollView.addView(root);
        setContentView(scrollView);
        requestCorePermissions();
    }

    private void updateRouteTitle() {
        if (routeTitle == null || plate == null) return;
        String value = plate.getText().toString().trim().toUpperCase();
        routeTitle.setText(value.isEmpty() ? "Driver GPS" : value);
    }

    private LinearLayout metricRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(14), 0, 0);
        row.addView(metricTile("ENVIO", "15 s", CYAN), weightParams(0, 0, dp(6), 0));
        row.addView(metricTile("MODO", "Fondo", GREEN), weightParams(dp(6), 0, dp(6), 0));
        row.addView(metricTile("MAPA", "En vivo", GREEN_DARK), weightParams(dp(6), 0, 0, 0));
        return row;
    }

    private LinearLayout metricTile(String label, String value, int accent) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setPadding(dp(12), dp(10), dp(12), dp(10));
        tile.setBackground(roundedStroke(Color.rgb(248, 250, 252), dp(14), Color.rgb(226, 232, 240)));
        tile.addView(text(label, 10, MUTED, true));
        TextView number = text(value, 15, accent, true);
        number.setPadding(0, dp(4), 0, 0);
        tile.addView(number);
        return tile;
    }

    private LinearLayout.LayoutParams weightParams(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, -2, 1);
        params.setMargins(left, top, right, bottom);
        return params;
    }

    private LinearLayout card() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(18), dp(18), dp(18), dp(18));
        layout.setBackground(rounded(Color.WHITE, dp(16)));
        layout.setElevation(dp(2));
        return layout;
    }

    private LinearLayout labeledField(String label, EditText editText) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(0, dp(12), 0, 0);
        box.addView(text(label, 12, MUTED, true));
        box.addView(editText);
        return box;
    }

    private EditText field(String value) {
        EditText editText = new EditText(this);
        editText.setText(value);
        editText.setSingleLine(true);
        editText.setTextSize(16);
        editText.setTextColor(SLATE);
        editText.setHintTextColor(Color.rgb(148, 163, 184));
        editText.setPadding(dp(12), 0, dp(12), 0);
        editText.setMinHeight(dp(50));
        editText.setBackground(roundedStroke(SURFACE, dp(12), LINE));
        return editText;
    }

    private TextView sectionTitle(String value) {
        TextView textView = text(value.toUpperCase(), 12, GREEN, true);
        textView.setLetterSpacing(0.08f);
        textView.setPadding(0, 0, 0, dp(2));
        return textView;
    }

    private TextView pill(String value, int background, int foreground) {
        TextView textView = text(value, 11, foreground, true);
        textView.setGravity(Gravity.CENTER);
        textView.setPadding(dp(10), dp(5), dp(10), dp(5));
        textView.setBackground(rounded(background, dp(999)));
        return textView;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView textView = new TextView(this);
        textView.setText(value);
        textView.setTextSize(size);
        textView.setTextColor(color);
        if (bold) textView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return textView;
    }

    private Button button(String text, int background, int foreground) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setTextColor(foreground);
        button.setMinHeight(dp(54));
        button.setBackground(rounded(background, dp(12)));
        return button;
    }

    private GradientDrawable gradient(int start, int end) {
        GradientDrawable drawable = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{start, end});
        drawable.setCornerRadius(0);
        return drawable;
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private GradientDrawable roundedStroke(int color, int radius, int stroke) {
        GradientDrawable drawable = rounded(color, radius);
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams blockParams(int top) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, top, 0, 0);
        return params;
    }

    private LinearLayout.LayoutParams cardParams(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(left, top, right, bottom);
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void requestCorePermissions() {
        if (Build.VERSION.SDK_INT >= 23) {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissions(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.POST_NOTIFICATIONS
                }, 10);
            } else {
                requestPermissions(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                }, 10);
            }
        }
    }

    private void startTracking() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestCorePermissions();
            status.setText("Falta permiso de ubicacion.");
            return;
        }

        if (!consent.isChecked()) {
            status.setText("Acepta el uso de GPS para iniciar.");
            return;
        }

        String currentPlate = plate.getText().toString().trim().toUpperCase();
        if (currentPlate.isEmpty()) {
            status.setText("Ingresa la placa del vehiculo.");
            return;
        }

        routeTitle.setText(currentPlate);
        prefs.edit()
                .putString("serverUrl", serverUrl.getText().toString().trim())
                .putString("token", token.getText().toString().trim())
                .putString("plate", currentPlate)
                .putString("driver", driver.getText().toString().trim())
                .putString("orderId", orderId.getText().toString().trim())
                .putBoolean("consent", consent.isChecked())
                .apply();

        Intent intent = new Intent(this, TrackingService.class);
        intent.putExtra("serverUrl", serverUrl.getText().toString().trim());
        intent.putExtra("token", token.getText().toString().trim());
        intent.putExtra("plate", currentPlate);
        intent.putExtra("driver", driver.getText().toString().trim());
        intent.putExtra("orderId", orderId.getText().toString().trim());

        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
        status.setText("Seguimiento activo para " + currentPlate + ".");
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }
}
