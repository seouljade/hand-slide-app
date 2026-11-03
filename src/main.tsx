import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/slides.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// 배포 환경에서만 서비스 워커를 등록합니다. 한 번 접속한 뒤에는 인터넷 없이도 열 수 있습니다.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn("서비스 워커 등록 실패", err);
    });
  });
}
