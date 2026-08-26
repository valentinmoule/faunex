package fr.faunex.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Android 15+ (SDK 35/36) impose l'affichage bord à bord.
 * On l'active explicitement (rétrocompatible) puis on applique les encarts
 * système (status bar, navigation bar, encoche) en padding sur la WebView,
 * afin que le contenu reste toujours lisible.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Bord à bord + barres transparentes (équivalent de EdgeToEdge.enable())
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Thème clair uniquement : icônes système sombres sur fond clair
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(true);

        final View root = findViewById(android.R.id.content);
        root.setBackgroundColor(Color.parseColor("#f9f5ec"));

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(
                    bars.left,
                    bars.top,
                    bars.right,
                    Math.max(bars.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
