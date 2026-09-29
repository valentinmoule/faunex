import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerAppSW } from "./lib/registerSW";
import { setupNativeStatusBar } from "./lib/nativeUI";
import { setupAuthDeepLinks } from "./lib/authDeepLinks";
import { setupStaleBuildRecovery } from "./lib/appRecovery";

setupStaleBuildRecovery();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

registerAppSW();
setupNativeStatusBar();
setupAuthDeepLinks();

// Préchargement en tâche de fond des onglets principaux : la navigation
// entre pages devient instantanée, sans alourdir le premier affichage.
const prefetchTabs = () => {
  const conn = (navigator as any).connection;
  if (conn?.saveData || /2g/.test(conn?.effectiveType || "")) return;
  [
    () => import("./pages/BestiairePage"),
    () => import("./pages/CollectionPage"),
    () => import("./pages/ExplorersPage"),
    () => import("./pages/CapturePage"),
    () => import("./pages/NotificationsPage"),
  ].forEach((load, i) => setTimeout(() => load().catch(() => {}), i * 400));
};
window.addEventListener("load", () => {
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2000));
  idle(prefetchTabs, { timeout: 4000 });
});


