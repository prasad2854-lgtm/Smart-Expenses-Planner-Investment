package com.smartincomeplanner.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.telephony.SmsMessage;
import android.util.Log;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SmsScraperReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsScraper";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Object[] pdus = (Object[]) intent.getExtras().get("pdus");
            if (pdus != null) {
                for (Object pdu : pdus) {
                    SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                    String sender = smsMessage.getDisplayOriginatingAddress();
                    String messageBody = smsMessage.getMessageBody();

                    // Let the Cloud Backend API handle the exact numeric regex validation.
                    // Just forward any message that looks remotely financial.
                    if (messageBody.toLowerCase().contains("debited")
                            || messageBody.toLowerCase().contains("credited")
                            || messageBody.toLowerCase().contains("paid")
                            || messageBody.toLowerCase().contains("spent")
                            || messageBody.toLowerCase().contains("sent")
                            || messageBody.toLowerCase().contains("received")
                            || messageBody.toLowerCase().contains("a/c")) {
                        Log.d(TAG, "Finance SMS! Sender: " + sender + ", Body: " + messageBody);
                        sendToBackend(context, sender, messageBody);
                    }
                }
            }
        }
    }

    private void sendToBackend(Context context, String sender, String data) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
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
                json.put("source", sender);
                json.put("title", "SMS");
                json.put("data", data);
                json.put("type", "sms");

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
