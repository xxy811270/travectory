package com.travectory.mobile;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RoadbookImportPlugin.class);
        registerPlugin(ImageExportPlugin.class);
        registerPlugin(StaticMapPlugin.class);
        super.onCreate(savedInstanceState);
        captureRoadbook(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureRoadbook(intent);
    }

    private void captureRoadbook(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (Intent.ACTION_SEND.equals(intent.getAction())) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) return;
        try (InputStream input = getContentResolver().openInputStream(uri); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) return;
            byte[] buffer = new byte[8192]; int read; int total = 0;
            while ((read = input.read(buffer)) != -1) { total += read; if (total > 20 * 1024 * 1024) throw new IllegalArgumentException("路书文件超过 20MB"); output.write(buffer, 0, read); }
            RoadbookImportPlugin.setPending(displayName(uri), output.toString("UTF-8"));
        } catch (Exception ignored) { }
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) { int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (index >= 0) return cursor.getString(index); }
        } catch (Exception ignored) { }
        return uri.getLastPathSegment() == null ? "外部路书.roadbook.json" : uri.getLastPathSegment();
    }
}
