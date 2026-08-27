package fr.faunex.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Le contenu passe sous la status bar ; on compense via env(safe-area-inset-top)
    // et un minimum de 20 px côté CSS pour éviter que le header soit caché.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
  }
}
