import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Render the React app
createRoot(document.getElementById("root")!).render(
  <div className="safe-area">
    <App />
  </div>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
