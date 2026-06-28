// Guarded service worker registration.
// - Never registers in Lovable preview/dev or inside an iframe.
// - Supports ?sw=off kill switch.
// - On a new SW activation, reloads the page once so users get the latest version immediately.

const SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  try {
    if (!import.meta.env.PROD) return true;
    if (typeof window === "undefined") return true;
    if (window.top !== window.self) return true;
    const host = window.location.hostname;
    if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
    if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
    if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
    if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  } catch {
    return true;
  }
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* noop */
  }
}

export async function registerAppSW() {
  if (!("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    await unregisterAppSW();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    // When a new SW takes control (autoUpdate + skipWaiting), reload once to pick up new assets.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    // Periodically check for updates so installed PWAs don't sit on a stale version.
    const checkForUpdate = () => reg.update().catch(() => {});
    setInterval(checkForUpdate, 60 * 60 * 1000); // hourly
    window.addEventListener("focus", checkForUpdate);
  } catch {
    /* noop */
  }
}
