import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        basename={import.meta.env.BASE_URL.replace(/\/$/, "")}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
