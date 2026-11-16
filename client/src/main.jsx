import React from "react";
import ReactDOM from "react-dom/client";
import GoogleOAuthBootstrap from "./components/GoogleOAuthBootstrap.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthBootstrap />
    </ThemeProvider>
  </React.StrictMode>,
);
