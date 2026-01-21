import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Detect whether we are running inside Capacitor (native app) or browser (web)
const isNative =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor &&
  (typeof (window as any).Capacitor.isNativePlatform === "function"
    ? (window as any).Capacitor.isNativePlatform()
    : true);

// Tag the document so CSS can behave differently for web vs app
document.documentElement.classList.toggle("native", isNative);
document.documentElement.classList.toggle("web", !isNative);

// WEB-ONLY: iOS Safari viewport fix
function setAppHeightVar() {
  if (typeof window === "undefined") return;
  if (isNative) return; // keep app untouched
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

setAppHeightVar();
window.addEventListener("resize", setAppHeightVar);
window.addEventListener("orientationchange", setAppHeightVar);

// Render the React app
createRoot(document.getElementById("root")!).render(
  <div className="safe-area">
    <App />
  </div>
);

// IMPORTANT:
// Only register the service worker in production builds.
// In dev, it can cache assets and make refreshes look like nothing changed.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}
