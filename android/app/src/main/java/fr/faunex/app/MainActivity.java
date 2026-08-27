package fr.faunex.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

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
        // au conteneur natif pour déplacer physiquement toute la WebView,
        // y compris ses éléments CSS fixed/sticky.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (bridge == null || bridge.getWebView() == null) return;
        View webView = bridge.getWebView();
        View decorView = getWindow().getDecorView();

        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets statusBars = windowInsets.getInsetsIgnoringVisibility(
                WindowInsetsCompat.Type.statusBars()
            );
            ViewGroup.LayoutParams params = webView.getLayoutParams();
            if (params instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) params;
                if (margins.topMargin != statusBars.top) {
                    margins.topMargin = statusBars.top;
                    webView.setLayoutParams(margins);
                }
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(decorView);
    }
}
