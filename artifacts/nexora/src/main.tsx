import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {})
        .catch(() => {});
    });
  }
}
