package com.nexora.driver;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
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

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(36, 36, 36, 36);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("Nexora Driver");
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        title.setTypeface(null, 1);
        root.addView(title, matchWrap());

        TextView subtitle = new TextView(this);
        subtitle.setText("GPS en segundo plano para prueba directa");
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(subtitle, matchWrap());

        serverUrl = field("Endpoint GPS", prefs.getString("serverUrl", "https://nexoraenterprice.netlify.app/api/transport/gps"));
        token = field("Token GPS", prefs.getString("token", "nexora-demo-gps-2026"));
        plate = field("Placa", prefs.getString("plate", "TRK-482"));
        driver = field("Conductor", prefs.getString("driver", "Conductor demo"));
        orderId = field("Orden", prefs.getString("orderId", "OT-1048"));

        root.addView(serverUrl);
        root.addView(token);
        root.addView(plate);
        root.addView(driver);
        root.addView(orderId);

        Button start = button("Iniciar seguimiento GPS");
        start.setOnClickListener(v -> startTracking());
        root.addView(start, matchWrap());

        Button stop = button("Detener seguimiento");
        stop.setOnClickListener(v -> stopService(new Intent(this, TrackingService.class)));
        root.addView(stop, matchWrap());

        Button settings = button("Abrir permisos de la app");
        settings.setOnClickListener(v -> openAppSettings());
        root.addView(settings, matchWrap());

        status = new TextView(this);
        status.setText("Permite ubicacion y deja esta app con permiso sin restricciones de bateria.");
        status.setTextSize(13);
        status.setPadding(0, 24, 0, 0);
        root.addView(status, matchWrap());

        setContentView(root);
        requestCorePermissions();
    }

    private EditText field(String hint, String value) {
        EditText editText = new EditText(this);
        editText.setHint(hint);
        editText.setText(value);
        editText.setSingleLine(true);
        editText.setTextSize(14);
        editText.setPadding(0, 18, 0, 18);
        return editText;
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams matchWrap() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 12, 0, 0);
        return params;
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
            status.setText("Falta permiso de ubicacion.");
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
        status.setText("Seguimiento iniciado. Debe quedar una notificacion activa de Nexora.");
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }
}
