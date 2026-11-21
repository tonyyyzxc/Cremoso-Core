import React from "react";
import ReactDOM from "react-dom/client";
import GoogleOAuthBootstrap from "./components/GoogleOAuthBootstrap.jsx";
import { SoundProvider } from "./context/SoundContext.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <SoundProvider>
        <GoogleOAuthBootstrap />
      </SoundProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
