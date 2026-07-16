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
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private EditText serverUrl;
    private EditText token;
    private EditText plate;
    private EditText driver;
    private EditText orderId;
    private TextView status;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("nexora-driver", Context.MODE_PRIVATE);

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(0, 0, 0, dp(28));
        root.setBackgroundColor(Color.rgb(241, 245, 249));

        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setPadding(dp(24), dp(28), dp(24), dp(24));
        hero.setBackground(rounded(Color.rgb(4, 120, 87), 0));
        root.addView(hero, new LinearLayout.LayoutParams(-1, -2));

        TextView eyebrow = text("NEXORA", 11, Color.rgb(167, 243, 208), true);
        eyebrow.setLetterSpacing(0.12f);
        hero.addView(eyebrow);

        TextView title = text("Driver GPS", 30, Color.WHITE, true);
        title.setPadding(0, dp(4), 0, 0);
        hero.addView(title);

        TextView subtitle = text("Seguimiento en segundo plano para rutas activas.", 14, Color.rgb(220, 252, 231), false);
        subtitle.setPadding(0, dp(6), 0, 0);
        hero.addView(subtitle);

        LinearLayout statusCard = card();
        statusCard.setPadding(dp(18), dp(16), dp(18), dp(16));
        TextView statusLabel = text("Estado operativo", 11, Color.rgb(100, 116, 139), true);
        statusLabel.setLetterSpacing(0.08f);
        statusCard.addView(statusLabel);
        status = text("Listo para iniciar seguimiento", 18, Color.rgb(15, 23, 42), true);
        status.setPadding(0, dp(5), 0, 0);
        statusCard.addView(status);
        TextView statusHint = text("Mantenga activa la notificacion de Nexora durante la ruta.", 13, Color.rgb(71, 85, 105), false);
        statusHint.setPadding(0, dp(6), 0, 0);
        statusCard.addView(statusHint);
        root.addView(statusCard, cardParams(dp(24), dp(-18), dp(24), 0));

        plate = field("Placa del vehiculo", prefs.getString("plate", "TRK-482"));
        driver = field("Conductor", prefs.getString("driver", "Conductor demo"));
        orderId = field("Orden o ruta", prefs.getString("orderId", "OT-1048"));
        serverUrl = field("Endpoint GPS", prefs.getString("serverUrl", "https://nexoraenterprice.netlify.app/api/transport/gps"));
        token = field("Token GPS", prefs.getString("token", "nexora-demo-gps-2026"));

        LinearLayout routeCard = card();
        routeCard.addView(sectionTitle("Ruta activa"));
        routeCard.addView(labeledField("Vehiculo", plate));
        routeCard.addView(labeledField("Conductor", driver));
        routeCard.addView(labeledField("Orden", orderId));

        Button start = button("Iniciar seguimiento", Color.rgb(4, 120, 87), Color.WHITE);
        start.setOnClickListener(v -> startTracking());
        routeCard.addView(start, blockParams(dp(14)));

        Button stop = button("Detener", Color.rgb(226, 232, 240), Color.rgb(15, 23, 42));
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, TrackingService.class));
            status.setText("Seguimiento detenido");
        });
        routeCard.addView(stop, blockParams(dp(10)));
        root.addView(routeCard, cardParams(dp(24), dp(18), dp(24), 0));

        LinearLayout techCard = card();
        techCard.addView(sectionTitle("Conexion Nexora"));
        techCard.addView(labeledField("Servidor", serverUrl));
        techCard.addView(labeledField("Token", token));

        Button settings = button("Permisos y bateria", Color.rgb(15, 23, 42), Color.WHITE);
        settings.setOnClickListener(v -> openAppSettings());
        techCard.addView(settings, blockParams(dp(14)));
        root.addView(techCard, cardParams(dp(24), dp(16), dp(24), 0));

        TextView footer = text("GPS real: la torre de control recibe puntos y dibuja el recorrido completo.", 12, Color.rgb(100, 116, 139), false);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(dp(24), dp(18), dp(24), 0);
        root.addView(footer);

        scrollView.addView(root);
        setContentView(scrollView);
        requestCorePermissions();
    }

    private LinearLayout card() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(18), dp(18), dp(18), dp(18));
        layout.setBackground(rounded(Color.WHITE, dp(14)));
        return layout;
    }

    private LinearLayout labeledField(String label, EditText editText) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(0, dp(10), 0, 0);
        box.addView(text(label, 12, Color.rgb(71, 85, 105), true));
        box.addView(editText);
        return box;
    }

    private EditText field(String hint, String value) {
        EditText editText = new EditText(this);
        editText.setHint(hint);
        editText.setText(value);
        editText.setSingleLine(true);
        editText.setTextSize(16);
        editText.setTextColor(Color.rgb(15, 23, 42));
        editText.setHintTextColor(Color.rgb(148, 163, 184));
        editText.setPadding(dp(12), 0, dp(12), 0);
        editText.setMinHeight(dp(48));
        editText.setBackground(roundedStroke(Color.rgb(248, 250, 252), dp(10), Color.rgb(203, 213, 225)));
        return editText;
    }

    private TextView sectionTitle(String value) {
        TextView textView = text(value.toUpperCase(), 12, Color.rgb(4, 120, 87), true);
        textView.setLetterSpacing(0.08f);
        textView.setPadding(0, 0, 0, dp(4));
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
        button.setMinHeight(dp(52));
        button.setBackground(rounded(background, dp(10)));
        return button;
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
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, 10);
        }
    }

    private void startTracking() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestCorePermissions();
            status.setText("Falta permiso de ubicacion");
            return;
        }

        prefs.edit()
                .putString("serverUrl", serverUrl.getText().toString().trim())
                .putString("token", token.getText().toString().trim())
                .putString("plate", plate.getText().toString().trim())
                .putString("driver", driver.getText().toString().trim())
                .putString("orderId", orderId.getText().toString().trim())
                .apply();

        Intent intent = new Intent(this, TrackingService.class);
        intent.putExtra("serverUrl", serverUrl.getText().toString().trim());
        intent.putExtra("token", token.getText().toString().trim());
        intent.putExtra("plate", plate.getText().toString().trim());
        intent.putExtra("driver", driver.getText().toString().trim());
        intent.putExtra("orderId", orderId.getText().toString().trim());

        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
        status.setText("Seguimiento activo");
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }
}
