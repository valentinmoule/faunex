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


