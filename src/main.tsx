import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerAppSW } from "./lib/registerSW";
import { setupNativeStatusBar } from "./lib/nativeUI";
import { setupAuthDeepLinks } from "./lib/authDeepLinks";
import { setupStaleBuildRecovery } from "./lib/appRecovery";
import { prefetchTabs } from "./lib/routePreload";

setupStaleBuildRecovery();

const root = document.getElementById("root");
if (!root) throw new Error("App root missing");
createRoot(root).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

registerAppSW();
setupNativeStatusBar();
setupAuthDeepLinks();

// Préchargement en tâche de fond des onglets principaux : la navigation
// entre pages devient instantanée, sans alourdir le premier affichage.
window.addEventListener("load", () => {
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2000));
  idle(prefetchTabs, { timeout: 4000 });
});


