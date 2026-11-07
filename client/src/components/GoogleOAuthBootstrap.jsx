import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "./ToastProvided.jsx";
import App from "../../App.jsx";

export default function GoogleOAuthBootstrap() {
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/api/auth-settings/public`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load public sign-in settings.");
        return response.json();
      })
      .then((config) => {
        setGoogleClientId(
          config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
        );
      })
      .catch(() => setGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID || ""));
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId} locale="en">
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
