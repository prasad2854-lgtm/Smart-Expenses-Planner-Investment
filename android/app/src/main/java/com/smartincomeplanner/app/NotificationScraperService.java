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
        if (packageName == null)
            return;
        String lowerPackage = packageName.toLowerCase();
        // Filter known finance apps and standard SMS messengers
        if (lowerPackage.contains("nbu.paisa.user") || lowerPackage.contains("phonepe")
                || lowerPackage.contains("paytm") || lowerPackage.contains("bank") || lowerPackage.contains("hdfc")
                || lowerPackage.contains("sbi") || lowerPackage.contains("messaging") || lowerPackage.contains("mms")
                || lowerPackage.contains("sms")) {

            CharSequence titleSeq = sbn.getNotification().extras.getCharSequence("android.title");
            CharSequence textSeq = sbn.getNotification().extras.getCharSequence("android.text");
            String title = titleSeq != null ? titleSeq.toString() : "";
            String text = textSeq != null ? textSeq.toString() : "";

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

                URL url = new URL("https://smart-income-planner.onrender.com/api/transactions/automated");
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
