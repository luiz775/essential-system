import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ColorModeProvider } from "./theme/ColorModeContext";
import { EssenceTheme } from "./theme/EssenceTheme";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ColorModeProvider>
        <EssenceTheme>
          <AuthProvider>
            <App />
          </AuthProvider>
        </EssenceTheme>
      </ColorModeProvider>
    </BrowserRouter>
  </StrictMode>
);
