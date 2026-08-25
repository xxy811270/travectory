package com.travectory.mobile;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "StaticMap")
public class StaticMapPlugin extends Plugin {
    @PluginMethod
    public void fetch(PluginCall call) {
        String value = call.getString("url");
        if (value == null) { call.reject("缺少静态地图地址"); return; }
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(value);
                if (!"https".equals(url.getProtocol()) || !"restapi.amap.com".equals(url.getHost())) throw new SecurityException("仅允许访问高德静态地图");
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(25000);
                connection.setRequestProperty("User-Agent", "Travectory-Android/1.1.2");
                int status = connection.getResponseCode();
                String contentType = connection.getContentType();
                if (status != 200 || contentType == null || !contentType.startsWith("image/")) throw new IllegalStateException("高德静态地图返回异常：" + status);
                try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int read; int total = 0;
                    while ((read = input.read(buffer)) != -1) { total += read; if (total > 10 * 1024 * 1024) throw new IllegalStateException("静态地图文件过大"); output.write(buffer, 0, read); }
                    JSObject result = new JSObject();
                    result.put("dataUrl", "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
                    call.resolve(result);
                }
            } catch (Exception error) {
                call.reject("静态地图读取失败：" + error.getMessage(), error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "travectory-static-map").start();
    }
}
