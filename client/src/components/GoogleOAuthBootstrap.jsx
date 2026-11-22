import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "./ToastProvided.jsx";
import {
  fallbackAuthSettings,
  PublicAuthSettingsContext,
} from "../context/PublicAuthSettingsContext.jsx";
import App from "../../App.jsx";

export default function GoogleOAuthBootstrap() {
  const [authSettings, setAuthSettings] = useState(fallbackAuthSettings);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const controller = new AbortController();
    let isCancelled = false;

    fetch(`${apiUrl}/api/auth-settings/public`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load public sign-in settings.");
        return response.json();
      })
      .then((config) => {
        if (isCancelled) return;
        setAuthSettings({
          ...fallbackAuthSettings,
          ...config,
          googleClientId:
            config.googleClientId || fallbackAuthSettings.googleClientId,
          recaptchaSiteKey:
            config.recaptchaSiteKey || fallbackAuthSettings.recaptchaSiteKey,
          loaded: true,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setAuthSettings((current) => ({ ...current, loaded: true }));
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <PublicAuthSettingsContext.Provider value={authSettings}>
      <GoogleOAuthProvider clientId={authSettings.googleClientId} locale="en">
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </PublicAuthSettingsContext.Provider>
  );
}
