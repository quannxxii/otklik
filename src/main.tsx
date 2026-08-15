import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store";
import { Landing } from "./Landing";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
