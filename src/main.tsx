import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ProjectProvider } from "./context/ProjectContext";
import { canApplyPublishedUpdate } from "./services/publication";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const workers = navigator.serviceWorker;
  let controller = workers.controller;
  let pendingReload = false;
  const applyUpdate = () => {
    if (pendingReload && canApplyPublishedUpdate()) window.location.reload();
  };
  workers.addEventListener("controllerchange", () => {
    if (controller && workers.controller !== controller) pendingReload = true;
    controller = workers.controller;
    applyUpdate();
  });
  window.addEventListener("load", () => {
    workers.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none"
    }).then(registration => {
      const checkForUpdate = () => {
        if (document.visibilityState !== "visible") return;
        applyUpdate();
        if (navigator.onLine) {
          workers.controller?.postMessage("prepare-offline");
          void registration.update().catch(() => undefined);
        }
      };
      window.addEventListener("online", checkForUpdate);
      window.addEventListener("pageshow", checkForUpdate);
      window.addEventListener("focus", checkForUpdate);
      document.addEventListener("visibilitychange", checkForUpdate);
      window.setInterval(checkForUpdate, 60_000);
      checkForUpdate();
    }).catch(() => undefined);
  });
}
