import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme/p0008-globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
