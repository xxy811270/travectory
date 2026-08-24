package com.travectory.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RoadbookImport")
public class RoadbookImportPlugin extends Plugin {
    private static String pendingName;
    private static String pendingText;

    public static synchronized void setPending(String name, String text) { pendingName = name; pendingText = text; }

    @PluginMethod
    public synchronized void getPendingImport(PluginCall call) {
        JSObject result = new JSObject();
        if (pendingText != null) { result.put("filename", pendingName); result.put("text", pendingText); pendingName = null; pendingText = null; }
        call.resolve(result);
    }
}
