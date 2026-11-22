import { createContext, useContext } from "react";

const fallbackAuthSettings = {
  staffGoogleAuthEnabled: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
  recaptchaEnabled: true,
  gmailEnabled: true,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || "",
  loaded: false,
};

export const PublicAuthSettingsContext = createContext(fallbackAuthSettings);

export function usePublicAuthSettings() {
  return useContext(PublicAuthSettingsContext);
}

export { fallbackAuthSettings };
