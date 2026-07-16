package com.nexora.driver;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

public class TrackingService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "nexora_gps";
    private LocationManager locationManager;
    private String serverUrl;
    private String token;
    private String plate;
    private String driver;
    private String orderId;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        serverUrl = intent.getStringExtra("serverUrl");
        token = intent.getStringExtra("token");
        plate = intent.getStringExtra("plate");
        driver = intent.getStringExtra("driver");
        orderId = intent.getStringExtra("orderId");

        startForeground(1001, notification("GPS activo para " + plate));
        startLocationUpdates();
        return START_STICKY;
    }

    private void startLocationUpdates() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf();
            return;
        }

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15000, 5, this);
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000, 10, this);
        } catch (Exception ignored) {
            stopSelf();
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        int battery = -1;
        BatteryManager batteryManager = (BatteryManager) getSystemService(BATTERY_SERVICE);
        if (batteryManager != null && Build.VERSION.SDK_INT >= 21) {
            battery = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        }

        LocationUploader.upload(serverUrl, token, plate, driver, orderId, location, battery);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(1001, notification("Ultima senal enviada: " + plate));
        }
    }

    @Override
    public void onDestroy() {
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
    }

    @Override
    public void onProviderEnabled(String provider) {
    }

    @Override
    public void onProviderDisabled(String provider) {
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Nexora GPS", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Seguimiento GPS en segundo plano");
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification notification(String text) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder
                .setContentTitle("Nexora Driver")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();
    }
}
