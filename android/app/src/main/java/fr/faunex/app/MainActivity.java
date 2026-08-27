package fr.faunex.app;

import android.os.Bundle;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15 impose le bord-à-bord. On applique l'encart système réel
        // à la WebView pour garder tous les headers sous la barre de statut.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (bridge == null || bridge.getWebView() == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(bridge.getWebView(), (view, windowInsets) -> {
            Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            view.setPadding(0, statusBars.top, 0, 0);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(bridge.getWebView());
    }
}
