import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerAppSW } from "./lib/registerSW";
import { setupNativeStatusBar } from "./lib/nativeUI";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

registerAppSW();
setupNativeStatusBar();


