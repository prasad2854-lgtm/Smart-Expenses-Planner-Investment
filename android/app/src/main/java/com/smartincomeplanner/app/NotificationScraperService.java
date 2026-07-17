package com.smartincomeplanner.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.content.SharedPreferences;
import android.content.Context;
import android.util.Log;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class NotificationScraperService extends NotificationListenerService {
    private static final String TAG = "NotificationScraper";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        // Filter known finance apps: GPay, PhonePe, Paytm, Banks
        if (packageName.contains("nbu.paisa.user") || packageName.contains("phonepe")
                || packageName.contains("paytm") || packageName.contains("bank") || packageName.contains("hdfc")
                || packageName.contains("sbi")) {

            String title = sbn.getNotification().extras.getString("android.title");
            String text = sbn.getNotification().extras.getString("android.text");

            if (text != null && (text.toLowerCase().contains("sent") || text.toLowerCase().contains("paid")
                    || text.toLowerCase().contains("received") || text.toLowerCase().contains("debited")
                    || text.toLowerCase().contains("credited"))) {
                Log.d(TAG, "Finance Notification! Title: " + title + ", Text: " + text);
                sendToBackend(packageName, title, text);
            }
        }
    }

    private void sendToBackend(String source, String title, String data) {
        new Thread(() -> {
            try {
                // Fetch Capacitor injected JWT
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", null);

                URL url = new URL("http://127.0.0.1:3001/api/transactions/automated");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                if (token != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                conn.setDoOutput(true);

                JSONObject json = new JSONObject();
                json.put("source", source);
                json.put("title", title != null ? title : "");
                json.put("data", data);
                json.put("type", "notification");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = json.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }
                int code = conn.getResponseCode();
                Log.d(TAG, "Sent to backend, Response code: " + code);
            } catch (Exception e) {
                Log.e(TAG, "Failed HTTP Post", e);
            }
        }).start();
    }
}
