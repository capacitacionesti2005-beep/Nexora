package com.nexora.driver;

import android.location.Location;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class LocationUploader {
    public static void upload(String serverUrl, String token, String plate, String driver, String orderId, Location location, int battery) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(serverUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("x-nexora-gps-token", token);

                String json = "{"
                        + "\"plate\":\"" + escape(plate) + "\","
                        + "\"driver\":\"" + escape(driver) + "\","
                        + "\"orderId\":\"" + escape(orderId) + "\","
                        + "\"latitude\":" + location.getLatitude() + ","
                        + "\"longitude\":" + location.getLongitude() + ","
                        + "\"accuracy\":" + location.getAccuracy() + ","
                        + "\"speed\":" + location.getSpeed() + ","
                        + "\"bearing\":" + location.getBearing() + ","
                        + "\"battery\":" + battery + ","
                        + "\"recordedAt\":\"" + Instant.now().toString() + "\""
                        + "}";

                byte[] body = json.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(body.length);
                try (OutputStream outputStream = connection.getOutputStream()) {
                    outputStream.write(body);
                }
                connection.getResponseCode();
            } catch (Exception ignored) {
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
