import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Building2,
  Bell,
  CircleUserRound,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushBrowserId,
  getPushRegistrationStatus,
} from "../firebase.js";
import { useToast } from "../hooks/UseToast.jsx";
import { useEditLock } from "../hooks/useEditLock.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition } from "../components/loadingVariants.js";

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-[#FAF6F0] px-4 py-3 text-sm text-[#0A3B3D] outline-none transition placeholder:text-gray-400 focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";

const feedbackClassName = (message) =>
  message.toLowerCase().includes("saved")
    ? "text-sm text-emerald-700 dark:text-emerald-300"
    : "text-sm text-red-700 dark:text-red-300";

const integrationLabels = {
  recaptchaEnabled: "reCAPTCHA",
  gmailEnabled: "Brevo password-reset email",
  pdfEnabled: "PDF export",
  googleSheetsEnabled: "Google Sheets export",
  googleCalendarEnabled: "Google Calendar",
  googleDriveEnabled: "Google Drive",
  firebaseMessagingEnabled: "Firebase Cloud Messaging",
};

const integrationDescriptions = {
  staffGoogleAuthEnabled: "Google sign-in availability for admin and staff accounts.",
  recaptchaEnabled: "reCAPTCHA verification on password sign-in.",
  gmailEnabled: "Password-reset emails through Brevo. Super Admin credential verification emails remain available.",
  pdfEnabled: "PDF report export.",
  googleSheetsEnabled: "Google Sheets report export.",
  googleCalendarEnabled: "Google Calendar shift syncing.",
  googleDriveEnabled: "Google Drive connection and file actions.",
  firebaseMessagingEnabled: "Web push notifications delivered through Firebase Cloud Messaging.",
};

const credentialIntegrationByToggle = {
  staffGoogleAuthEnabled: "googleAuth",
  recaptchaEnabled: "recaptcha",
  gmailEnabled: "gmail",
  googleDriveEnabled: "googleDrive",
  googleCalendarEnabled: "googleCalendar",
  googleSheetsEnabled: "googleSheets",
  firebaseMessagingEnabled: "firebaseMessaging",
};

const credentialIntegrations = {
  googleAuth: { label: "Google sign-in", fields: { clientId: "Google client ID" } },
  recaptcha: {
    label: "reCAPTCHA",
    fields: { siteKey: "Site key", secretKey: "Secret key" },
  },
  gmail: {
    label: "Brevo transactional email",
    fields: {
      apiKey: "Brevo API key",
      sender: "Sender (Name <email>)",
    },
  },
  googleDrive: {
    label: "Google Drive",
    fields: {
      clientId: "OAuth client ID",
      clientSecret: "OAuth client secret",
      redirectUri: "Redirect URI",
    },
  },
  googleCalendar: {
    label: "Google Calendar",
    fields: {
      clientId: "OAuth client ID",
      clientSecret: "OAuth client secret",
      redirectUri: "Redirect URI",
    },
  },
  googleSheets: {
    label: "Google Sheets",
    fields: {
      clientId: "OAuth client ID",
      clientSecret: "OAuth client secret",
      redirectUri: "Redirect URI",
    },
  },
  firebaseMessaging: {
    label: "Firebase Cloud Messaging",
    fields: {
      apiKey: "Firebase API key",
      authDomain: "Firebase auth domain",
      projectId: "Firebase project ID",
      storageBucket: "Firebase storage bucket",
      messagingSenderId: "Firebase messaging sender ID",
      appId: "Firebase app ID",
      measurementId: "Firebase measurement ID",
      vapidKey: "VAPID public key",
    },
  },
};

export default function SettingsPage() {
  const toast = useToast();
  const userLock = useEditLock();
  const branchLock = useEditLock();
  const configLock = useEditLock();
  const pushLock = useEditLock();
  const integrationLock = useEditLock({ releaseOnUnmount: false });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);
  const [adminProfileFeedback, setAdminProfileFeedback] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [isSavingManager, setIsSavingManager] = useState(false);
  const [managerFeedback, setManagerFeedback] = useState("");
  const [branch, setBranch] = useState(null);
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchFeedback, setBranchFeedback] = useState("");
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [accountsWithoutPassword, setAccountsWithoutPassword] = useState(0);
  const [isSavingGoogleSetting, setIsSavingGoogleSetting] = useState(false);
  const [googleFeedback, setGoogleFeedback] = useState("");
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [savingIntegration, setSavingIntegration] = useState("");
  const [pendingIntegrationChange, setPendingIntegrationChange] = useState(null);
  const [credentialStatuses, setCredentialStatuses] = useState({});
  const [credentialEncryptionConfigured, setCredentialEncryptionConfigured] = useState(false);
  const [credentialEditor, setCredentialEditor] = useState(null);
  const [integrationContextMenu, setIntegrationContextMenu] = useState(null);
  const [credentialValues, setCredentialValues] = useState({});
  const [credentialUsername, setCredentialUsername] = useState("");
  const [credentialPin, setCredentialPin] = useState("");
  const [credentialCode, setCredentialCode] = useState("");
  const [credentialTestToken, setCredentialTestToken] = useState("");
  const [credentialCaptchaVersion, setCredentialCaptchaVersion] = useState(0);
  const [showCredentialCaptcha, setShowCredentialCaptcha] = useState(false);
  const [credentialChallengeId, setCredentialChallengeId] = useState("");
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [activityLoggingEnabled, setActivityLoggingEnabled] = useState(true);
  const [isSavingActivityLogging, setIsSavingActivityLogging] = useState(false);
  const [activityLoggingFeedback, setActivityLoggingFeedback] = useState("");
  const [pushRegistered, setPushRegistered] = useState(false);
  const [pushStatusLoaded, setPushStatusLoaded] = useState(false);
  const [isSavingPush, setIsSavingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [error, setError] = useState("");
  const [authSettingsLoaded, setAuthSettingsLoaded] = useState(false);
  const [passwordStatusLoaded, setPasswordStatusLoaded] = useState(false);
  const [branchLoaded, setBranchLoaded] = useState(false);
  const [adminProfileLoaded, setAdminProfileLoaded] = useState(
    user?.role !== "admin",
  );

  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.isSuperAdmin === true;

  useEffect(() => {
    apiRequest("/api/auth-settings")
      .then((config) => {
        setGoogleAuthEnabled(config.staffGoogleAuthEnabled);
        setIntegrationSettings({
          recaptchaEnabled: config.recaptchaEnabled !== false,
          gmailEnabled: config.gmailEnabled !== false,
          pdfEnabled: config.pdfEnabled !== false,
          googleSheetsEnabled: config.googleSheetsEnabled !== false,
          googleCalendarEnabled: config.googleCalendarEnabled !== false,
          googleDriveEnabled: config.googleDriveEnabled !== false,
          firebaseMessagingEnabled: config.firebaseMessagingEnabled !== false,
        });
        setActivityLoggingEnabled(config.activityLoggingEnabled !== false);
        setAccountsWithoutPassword(config.accountsWithoutPassword || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setAuthSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiRequest("/api/integration-credentials")
      .then((data) => {
        setCredentialStatuses(data.integrations || {});
        setCredentialEncryptionConfigured(data.encryptionConfigured === true);
      })
      .catch((err) => setError(err.message));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!["branch", "staff"].includes(user?.role)) return;
    getPushRegistrationStatus()
      .then(({ registered }) => setPushRegistered(registered))
      .catch((err) => setPushFeedback(err.message))
      .finally(() => setPushStatusLoaded(true));
  }, [user?.role]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("credentialValidation");
    if (!result) return;

    const integration = params.get("integration");
    if (integration) {
      apiRequest("/api/edit-locks/release", {
        method: "POST",
        body: JSON.stringify({
          resourceType: "IntegrationCredential",
          resourceId: integration,
        }),
      }).catch((releaseError) => console.error("Credential edit lock release failed:", releaseError));
    }
    const reason = params.get("reason");
    const label = credentialIntegrations[integration]?.label || "Integration";
    if (result === "success") {
      toast.success(`${label} credentials validated and saved.`);
    } else {
      const explanation = reason === "api_access"
        ? "Check that the Google API is enabled and the requested access was granted."
        : reason === "authorization"
          ? "Google authorization was canceled or rejected."
          : reason === "expired"
            ? "The validation expired. Start the process again."
            : "Check the OAuth credentials and registered redirect URI.";
      toast.error(`${label} validation failed. ${explanation} Previous credentials remain active.`);
    }
    params.delete("credentialValidation");
    params.delete("integration");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [toast]);

  useEffect(() => {
    apiRequest("/api/auth/password-status")
      .then((data) => setHasPassword(data.hasPassword))
      .catch((err) => setError(err.message))
      .finally(() => setPasswordStatusLoaded(true));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest("/api/auth/profile")
      .then(({ profile }) => {
        setAdminName(profile.name || "");
        setAdminPhone(profile.phone || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setAdminProfileLoaded(true));
  }, [isAdmin]);

  useEffect(() => {
    if (user?.role !== "branch") {
      Promise.resolve().then(() => setBranchLoaded(true));
      return;
    }
    apiRequest("/api/staff/branch")
      .then((data) => {
        setBranch(data.branch);
        setManagerName(data.manager?.name || "");
        setManagerPhone(data.manager?.phone || "");
        setManagerEmail(data.manager?.email || "");
        setBranchAddress(data.branch?.address || "");
        setBranchPhone(data.branch?.phone || "");
        setBranchEmail(data.branch?.contactEmail || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setBranchLoaded(true));
  }, [user?.role]);

  const initialLoading =
    !authSettingsLoaded ||
    !passwordStatusLoaded ||
    !branchLoaded ||
    !adminProfileLoaded;

  const ownsEditLock = (lock, resourceType, resourceId) => (
    lock.activeResource?.resourceType === resourceType
    && lock.activeResource.resourceId === String(resourceId)
  );

  const beginEditing = async (lock, resourceType, resourceId, setFeedback) => {
    if (ownsEditLock(lock, resourceType, resourceId)) return;
    try {
      const acquired = await lock.acquire(resourceType, resourceId);
      if (!acquired) {
        setFeedback("This record is currently unavailable for editing.");
      }
    } catch (err) {
      setFeedback(err.message);
    }
  };

  const saveManagerInfo = async (event) => {
    event.preventDefault();
    setIsSavingManager(true);
    setManagerFeedback("");
    try {
      const acquired = await userLock.acquire("User", user.id);
      if (!acquired) {
        setManagerFeedback("This record is currently unavailable for editing.");
        return;
      }
      const data = await apiRequest("/api/staff/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: managerName, phone: managerPhone }),
      });
      setManagerName(data.manager.name);
      setManagerPhone(data.manager.phone || "");
      setManagerEmail(data.manager.email || managerEmail);
      const updatedUser = {
        ...user,
        name: data.manager.name,
        phone: data.manager.phone || "",
      };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setManagerFeedback("Manager information saved.");
      toast.success("Manager information saved.");
    } catch (err) {
      setManagerFeedback(err.message);
    } finally {
      setIsSavingManager(false);
      try {
        await userLock.release();
      } catch (releaseError) {
        setManagerFeedback(releaseError.message);
      }
    }
  };

  const saveAdminProfile = async (event) => {
    event.preventDefault();
    setIsSavingAdminProfile(true);
    setAdminProfileFeedback("");
    try {
      const acquired = await userLock.acquire("User", user.id);
      if (!acquired) {
        setAdminProfileFeedback("This record is currently unavailable for editing.");
        return;
      }
      const { profile } = await apiRequest("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: adminName, phone: adminPhone }),
      });
      setAdminName(profile.name);
      setAdminPhone(profile.phone || "");
      const updatedUser = {
        ...user,
        name: profile.name,
        phone: profile.phone || "",
      };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAdminProfileFeedback("Profile saved successfully.");
      toast.success("Profile saved successfully.");
    } catch (err) {
      setAdminProfileFeedback(err.message);
    } finally {
      setIsSavingAdminProfile(false);
      try {
        await userLock.release();
      } catch (releaseError) {
        setAdminProfileFeedback(releaseError.message);
      }
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordFeedback("");
    if (hasPassword && !currentPassword) {
      setPasswordFeedback("Enter your current password to continue.");
      return;
    }
    if (password.length < 8) {
      setPasswordFeedback("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordFeedback("Passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const acquired = await userLock.acquire("User", user.id);
      if (!acquired) {
        setPasswordFeedback("This record is currently unavailable for editing.");
        return;
      }
      await apiRequest("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      setHasPassword(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPasswordFeedback("Password saved successfully.");
      toast.success(
        "Password saved. You can now sign in with your email and password.",
      );
    } catch (err) {
      setPasswordFeedback(err.message);
    } finally {
      setIsSavingPassword(false);
      try {
        await userLock.release();
      } catch (releaseError) {
        setPasswordFeedback(releaseError.message);
      }
    }
  };

  const saveBranchInfo = async (event) => {
    event.preventDefault();
    setIsSavingBranch(true);
    setBranchFeedback("");
    try {
      const acquired = await branchLock.acquire("Branch", branch._id);
      if (!acquired) {
        setBranchFeedback("This record is currently unavailable for editing.");
        return;
      }
      const data = await apiRequest("/api/staff/branch", {
        method: "PATCH",
        body: JSON.stringify({
          address: branchAddress,
          phone: branchPhone,
          contactEmail: branchEmail,
        }),
      });
      setBranch(data.branch);
      setBranchFeedback("Branch details saved.");
      toast.success("Branch details saved.");
    } catch (err) {
      setBranchFeedback(err.message);
    } finally {
      setIsSavingBranch(false);
      try {
        await branchLock.release();
      } catch (releaseError) {
        setBranchFeedback(releaseError.message);
      }
    }
  };

  const toggleGoogleAuth = async () => {
    try {
      const acquired = await configLock.acquire("AuthConfig", "default");
      if (!acquired) {
        setGoogleFeedback("This record is currently unavailable for editing.");
        return;
      }
    } catch (err) {
      setGoogleFeedback(err.message);
      return;
    }
    setPendingIntegrationChange({
      setting: "staffGoogleAuthEnabled",
      enabled: !googleAuthEnabled,
    });
  };

  const confirmIntegrationChange = async () => {
    if (!pendingIntegrationChange) return;
    const { setting, enabled: nextValue } = pendingIntegrationChange;
    if (setting !== "staffGoogleAuthEnabled") {
      setSavingIntegration(setting);
      try {
        const acquired = await configLock.acquire("AuthConfig", "default");
        if (!acquired) {
          toast.error("This record is currently unavailable for editing.");
          return;
        }
        const config = await apiRequest("/api/auth-settings", {
          method: "PATCH",
          body: JSON.stringify({ [setting]: nextValue }),
        });
        setIntegrationSettings((current) => ({ ...current, [setting]: config[setting] !== false }));
        toast.success(`${integrationLabels[setting]} ${config[setting] ? "enabled" : "disabled"}.`);
        setPendingIntegrationChange(null);
        await configLock.release();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSavingIntegration("");
      }
      return;
    }

    setIsSavingGoogleSetting(true);
    setGoogleFeedback("");
    try {
      const acquired = await configLock.acquire("AuthConfig", "default");
      if (!acquired) {
        setGoogleFeedback("This record is currently unavailable for editing.");
        return;
      }
      const config = await apiRequest("/api/auth-settings", {
        method: "PATCH",
        body: JSON.stringify({ staffGoogleAuthEnabled: nextValue }),
      });
      setGoogleAuthEnabled(config.staffGoogleAuthEnabled);
      setAccountsWithoutPassword(config.accountsWithoutPassword || 0);
      setGoogleFeedback("Sign-in preference saved.");
      toast.success(
        config.staffGoogleAuthEnabled
          ? "Google sign-in enabled for all accounts."
          : "Google sign-in disabled for all accounts.",
      );
      setPendingIntegrationChange(null);
      await configLock.release();
    } catch (err) {
      setGoogleFeedback(err.message);
      toast.error(err.message);
    } finally {
      setIsSavingGoogleSetting(false);
    }
  };

  const toggleActivityLogging = async () => {
    const nextValue = !activityLoggingEnabled;
    setIsSavingActivityLogging(true);
    setActivityLoggingFeedback("");
    try {
      const acquired = await configLock.acquire("AuthConfig", "default");
      if (!acquired) {
        setActivityLoggingFeedback("This record is currently unavailable for editing.");
        return;
      }
      const config = await apiRequest("/api/auth-settings", {
        method: "PATCH",
        body: JSON.stringify({ activityLoggingEnabled: nextValue }),
      });
      setActivityLoggingEnabled(config.activityLoggingEnabled !== false);
      setActivityLoggingFeedback("Activity logging preference saved.");
      toast.success(
        config.activityLoggingEnabled
          ? "Activity logging enabled."
          : "Activity logging paused.",
      );
    } catch (err) {
      setActivityLoggingFeedback(err.message);
    } finally {
      setIsSavingActivityLogging(false);
      try {
        await configLock.release();
      } catch (releaseError) {
        setActivityLoggingFeedback(releaseError.message);
      }
    }
  };

  const togglePushNotifications = async () => {
    setIsSavingPush(true);
    setPushFeedback("");
    try {
      if (pushRegistered) {
        const acquired = await pushLock.acquire("PushRegistration", getPushBrowserId());
        if (!acquired) {
          setPushFeedback("This record is currently unavailable for editing.");
          return;
        }
        const { tokenRemoved } = await disablePushNotifications();
        setPushRegistered(false);
        setPushFeedback(tokenRemoved
          ? "Push alerts are disabled for this browser."
          : "Push alerts are disabled on the server, but this browser could not clear its saved token.");
        if (tokenRemoved) toast.success("Push alerts disabled.");
        else toast.error("Push alerts were disabled, but the browser token could not be cleared.");
      } else {
        const registered = await enablePushNotifications();
        if (!registered) {
          setPushFeedback("Notification permission was not granted.");
          return;
        }
        setPushRegistered(true);
        setPushFeedback("Push alerts are enabled for this browser.");
        toast.success("Push alerts enabled.");
      }
    } catch (err) {
      setPushFeedback(err.message);
      toast.error(err.message);
    } finally {
      setIsSavingPush(false);
      try {
        await pushLock.release();
      } catch (releaseError) {
        setPushFeedback(releaseError.message);
      }
    }
  };

  const toggleIntegration = async (setting) => {
    try {
      const acquired = await configLock.acquire("AuthConfig", "default");
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
    } catch (err) {
      setError(err.message);
      return;
    }
    setPendingIntegrationChange({
      setting,
      enabled: !integrationSettings[setting],
    });
  };

  const cancelIntegrationChange = async () => {
    if (isSavingGoogleSetting || savingIntegration) return;
    setPendingIntegrationChange(null);
    try {
      await configLock.release();
    } catch (err) {
      setError(err.message);
    }
  };

  const showIntegrationContextMenu = (event, setting) => {
    const integration = credentialIntegrationByToggle[setting];
    if (!isSuperAdmin || !integration || !credentialEncryptionConfigured) return;
    event.preventDefault();
    setIntegrationContextMenu({
      integration,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 210)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)),
    });
  };

  const openCredentialEditor = async (integration, mode) => {
    try {
      const acquired = await integrationLock.acquire("IntegrationCredential", integration);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
    } catch (err) {
      setError(err.message);
      return;
    }
    const fields = credentialIntegrations[integration].fields;
    setIntegrationContextMenu(null);
    setCredentialEditor({ integration, mode, step: "account" });
    setCredentialValues(Object.fromEntries(Object.keys(fields).map((field) => [field, ""])));
    setCredentialUsername("");
    setCredentialPin("");
    setCredentialCode("");
    setCredentialTestToken("");
    setCredentialCaptchaVersion((current) => current + 1);
    setShowCredentialCaptcha(false);
    setCredentialChallengeId("");
  };

  const closeCredentialEditor = async () => {
    if (credentialBusy) return;
    try {
      await integrationLock.release();
    } catch (err) {
      setError(err.message);
    }
    setCredentialEditor(null);
    setCredentialValues({});
    setCredentialPin("");
    setCredentialCode("");
    setCredentialTestToken("");
    setCredentialCaptchaVersion((current) => current + 1);
    setShowCredentialCaptcha(false);
    setCredentialChallengeId("");
  };

  const requestCredentialCode = async (event) => {
    event?.preventDefault();
    setCredentialBusy(true);
    try {
      const result = await apiRequest("/api/integration-credentials/challenge", {
        method: "POST",
        body: JSON.stringify({
          username: credentialUsername,
          pin: credentialPin,
        }),
      });
      setCredentialChallengeId(result.challengeId);
      setCredentialPin("");
      setCredentialEditor((current) => ({ ...current, step: "otp" }));
      toast.success("Verification code sent to the Super Admin email.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCredentialBusy(false);
    }
  };

  const verifyCredentialCode = async (event) => {
    event.preventDefault();
    setCredentialBusy(true);
    try {
      await apiRequest("/api/integration-credentials/challenge/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeId: credentialChallengeId,
          code: credentialCode,
        }),
      });
      setCredentialCode("");
      setCredentialEditor((current) => ({ ...current, step: "key" }));
      toast.success("Verification complete. Enter the new integration credentials.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCredentialBusy(false);
    }
  };

  const submitCredentialChange = async (event, testProof = {}) => {
    event?.preventDefault();
    if (!credentialEditor || !credentialChallengeId || credentialEditor.step !== "key") return;
    if (
      credentialEditor.mode === "replace"
      && credentialEditor.integration === "googleAuth"
      && !testProof.idToken
    ) {
      toast.error("Complete the Google sign-in test before saving.");
      return;
    }
    if (credentialEditor.mode === "remove" && !window.confirm(
      "Remove this saved credential override and use the environment credentials instead?",
    )) return;

    setCredentialBusy(true);
    try {
      const { integration, mode } = credentialEditor;
      const acquired = await integrationLock.acquire("IntegrationCredential", integration);
      if (!acquired) {
        toast.error("This record is currently unavailable for editing.");
        return;
      }
      const request = mode === "remove"
        ? {
            method: "DELETE",
            body: JSON.stringify({ challengeId: credentialChallengeId }),
          }
        : {
            method: "POST",
            body: JSON.stringify({
              challengeId: credentialChallengeId,
              credentials: credentialValues,
              ...(integration === "recaptcha"
                ? { responseToken: credentialTestToken }
                : testProof),
            }),
          };
      const result = await apiRequest(
        mode === "remove"
          ? `/api/integration-credentials/${integration}`
          : `/api/integration-credentials/${integration}/validate`,
        request,
      );
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      const status = await apiRequest("/api/integration-credentials");
      setCredentialStatuses(status.integrations || {});
      setCredentialEncryptionConfigured(status.encryptionConfigured === true);
      setCredentialEditor(null);
      setCredentialValues({});
      setCredentialCode("");
      setCredentialTestToken("");
      setCredentialChallengeId("");
      await integrationLock.release();
      toast.success(result.message);
      if (["googleAuth", "recaptcha", "firebaseMessaging"].includes(integration)) {
        window.setTimeout(() => window.location.reload(), 700);
      }
    } catch (err) {
      if (credentialEditor.integration === "recaptcha") {
        setCredentialTestToken("");
        setCredentialCaptchaVersion((current) => current + 1);
      }
      toast.error(err.message);
    } finally {
      setCredentialBusy(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto max-w-5xl space-y-7 text-[#0A3B3D] dark:text-white">
        {initialLoading && (
          <p role="status" className="sr-only">
            Loading settings...
          </p>
        )}
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fadeTransition}
        >
          <p className="text-sm font-medium text-[#0A8B8E]">
            Account preferences
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Settings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Manage your profile, password, and branch preferences for Cremoso.
          </p>
        </motion.header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {initialLoading ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-72 max-w-full" />
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="space-y-4 rounded-2xl border border-gray-200 p-6 dark:border-neutral-800"
                  >
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <Skeleton className="h-6 w-44" />
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="space-y-4 rounded-2xl border border-gray-200 p-6 dark:border-neutral-800"
                  >
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <FadeIn from="bottom" delay={0.3}>
            <div className="space-y-6">
              {["branch", "staff"].includes(user?.role) && (
                <section className="rounded-3xl border border-[#0A8B8E]/20 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Browser notifications</h3>
                      <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                        Receive new-order alerts and, for branch managers, low-stock alerts on this browser.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushRegistered}
                      aria-label="Enable browser notifications"
                      onClick={togglePushNotifications}
                      disabled={
                        isSavingPush ||
                        !pushStatusLoaded ||
                        !authSettingsLoaded ||
                        (!pushRegistered && integrationSettings.firebaseMessagingEnabled === false)
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${pushRegistered ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${pushRegistered ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {integrationSettings.firebaseMessagingEnabled === false
                      ? "Push alerts are currently disabled by an administrator."
                      : pushRegistered
                        ? "Push alerts are enabled for this browser."
                        : "Enable alerts to receive notifications while this browser is not open to the app."}
                  </p>
                  {pushFeedback && (
                    <p
                      role={
                        ["Push alerts are enabled for this browser.", "Push alerts are disabled for this browser."]
                          .includes(pushFeedback) ? "status" : "alert"
                      }
                      className={`mt-3 text-sm ${["Push alerts are enabled for this browser.", "Push alerts are disabled for this browser."].includes(pushFeedback) ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      {pushFeedback}
                    </p>
                  )}
                </section>
              )}
              <section className="rounded-3xl border border-[#0A8B8E]/20 bg-linear-to-br from-white via-white to-[#0A8B8E]/5 p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-[#0A8B8E]/10 sm:p-6">
                <header className="mb-5 border-b border-[#0A8B8E]/10 pb-4 dark:border-neutral-800">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A8B8E]">
                    Account and security
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    Your profile and sign-in
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Keep your contact information current and protect account
                    access.
                  </p>
                </header>
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
                        <KeyRound size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {hasPassword ? "Change password" : "Set a password"}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                          {hasPassword
                            ? "Enter your current password, then choose a new one."
                            : "Create a password to sign in manually with your email."}
                        </p>
                      </div>
                    </div>
                    <form
                      onSubmit={savePassword}
                      className="space-y-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                    >
                      <label className="block space-y-1.5 text-sm font-medium">
                        Current password{" "}
                        {!hasPassword && (
                          <span className="font-normal text-gray-500">
                            (optional if none is set)
                          </span>
                        )}
                        <span className="relative block">
                          <input
                            className={`${inputClassName} pr-12`}
                            type={showCurrentPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={currentPassword}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setPasswordFeedback)}
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                            placeholder={
                              hasPassword ? "" : "No current password set"
                            }
                            required={hasPassword}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword((visible) => !visible)
                            }
                            aria-label={
                              showCurrentPassword
                                ? "Hide current password"
                                : "Show current password"
                            }
                            className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                          >
                            {showCurrentPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </span>
                      </label>
                      <label className="block space-y-1.5 text-sm font-medium">
                        Set a new password
                        <span className="relative block">
                          <input
                            className={`${inputClassName} pr-12`}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            value={password}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setPasswordFeedback)}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                            placeholder="At least 8 characters"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((visible) => !visible)
                            }
                            aria-label={
                              showPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </span>
                      </label>
                      <label className="block space-y-1.5 text-sm font-medium">
                        Confirm password
                        <span className="relative block">
                          <input
                            className={`${inputClassName} pr-12`}
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            value={confirmPassword}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setPasswordFeedback)}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            placeholder="Enter the password again"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((visible) => !visible)
                            }
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirmation password"
                                : "Show confirmation password"
                            }
                            className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </span>
                      </label>
                      {passwordFeedback && (
                        <p
                          role={
                            passwordFeedback.toLowerCase().includes("saved")
                              ? "status"
                              : "alert"
                          }
                          className={feedbackClassName(passwordFeedback)}
                        >
                          {passwordFeedback}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingPassword || userLock.isBlocked("User", user.id)}
                        className={buttonClassName}
                      >
                        {isSavingPassword ? "Saving..." : "Save password"}
                      </button>
                    </form>
                  </section>

                  {isAdmin && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
                          <CircleUserRound size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold">Admin information</h3>
                          <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                            Update your contact details. Your login email is
                            read-only.
                          </p>
                        </div>
                      </div>
                      <form
                        onSubmit={saveAdminProfile}
                        className="space-y-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                      >
                        <label className="block space-y-1.5 text-sm font-medium">
                          Admin name
                          <input
                            className={inputClassName}
                            value={adminName}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setAdminProfileFeedback)}
                            onChange={(event) =>
                              setAdminName(event.target.value)
                            }
                            autoComplete="name"
                            required
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                          Login email
                          <input
                            className={`${inputClassName} opacity-70`}
                            value={user?.email || ""}
                            readOnly
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                          Admin phone
                          <input
                            className={inputClassName}
                            type="tel"
                            autoComplete="tel"
                            value={adminPhone}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setAdminProfileFeedback)}
                            onChange={(event) =>
                              setAdminPhone(event.target.value)
                            }
                            placeholder="Optional"
                          />
                        </label>
                        {adminProfileFeedback && (
                          <p
                            role={
                              adminProfileFeedback
                                .toLowerCase()
                                .includes("saved")
                                ? "status"
                                : "alert"
                            }
                            className={feedbackClassName(adminProfileFeedback)}
                          >
                            {adminProfileFeedback}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingAdminProfile || userLock.isBlocked("User", user.id)}
                          className={buttonClassName}
                        >
                          {isSavingAdminProfile
                            ? "Saving..."
                            : "Save admin information"}
                        </button>
                      </form>
                    </section>
                  )}

                  {user?.role === "branch" && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
                          <CircleUserRound size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold">Manager information</h3>
                          <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                            Update your contact details. Your login email is
                            read-only.
                          </p>
                        </div>
                      </div>
                      <form
                        onSubmit={saveManagerInfo}
                        className="space-y-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                      >
                        <label className="block space-y-1.5 text-sm font-medium">
                          Manager name
                          <input
                            className={inputClassName}
                            value={managerName}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setManagerFeedback)}
                            onChange={(event) =>
                              setManagerName(event.target.value)
                            }
                            autoComplete="name"
                            required
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                          Login email
                          <input
                            className={`${inputClassName} opacity-70`}
                            value={managerEmail}
                            readOnly
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                          Manager phone
                          <input
                            className={inputClassName}
                            type="tel"
                            autoComplete="tel"
                            value={managerPhone}
                            readOnly={!ownsEditLock(userLock, "User", user.id)}
                            onFocus={() => beginEditing(userLock, "User", user.id, setManagerFeedback)}
                            onChange={(event) =>
                              setManagerPhone(event.target.value)
                            }
                            placeholder="Optional"
                          />
                        </label>
                        {managerFeedback && (
                          <p
                            role={
                              managerFeedback.toLowerCase().includes("saved")
                                ? "status"
                                : "alert"
                            }
                            className={feedbackClassName(managerFeedback)}
                          >
                            {managerFeedback}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingManager || userLock.isBlocked("User", user.id)}
                          className={buttonClassName}
                        >
                          {isSavingManager
                            ? "Saving..."
                            : "Save manager information"}
                        </button>
                      </form>
                    </section>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-[#F2C879]/50 bg-linear-to-br from-white via-white to-[#F2C879]/10 p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-amber-950/20 sm:p-6">
                <header className="mb-5 border-b border-[#F2C879]/30 pb-4 dark:border-neutral-800">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A641B] dark:text-amber-300">
                    Branch and access settings
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    Operations preferences
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage your branch contact details and staff sign-in
                    options.
                  </p>
                </header>
                <div className="grid gap-5 lg:grid-cols-2">
                  {user?.role === "branch" && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-xl bg-[#F2C879]/25 p-2.5 text-[#8A641B]">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold">Your branch</h3>
                          <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                            Branch details associated with your staff account.
                          </p>
                        </div>
                      </div>
                      {branch ? (
                        <form
                          onSubmit={saveBranchInfo}
                          className="space-y-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                        >
                          <h4 className="font-semibold">{branch.name}</h4>
                          <label className="block space-y-1.5 text-sm font-medium">
                            <span className="inline-flex items-center gap-2">
                              <MapPin size={16} className="text-[#0A8B8E]" />{" "}
                              Address
                            </span>
                            <input
                              className={inputClassName}
                              value={branchAddress}
                              readOnly={!ownsEditLock(branchLock, "Branch", branch._id)}
                              onFocus={() => beginEditing(branchLock, "Branch", branch._id, setBranchFeedback)}
                              onChange={(event) =>
                                setBranchAddress(event.target.value)
                              }
                              placeholder="Street, city, or area"
                            />
                          </label>
                          <label className="block space-y-1.5 text-sm font-medium">
                            <span className="inline-flex items-center gap-2">
                              <Phone size={16} className="text-[#0A8B8E]" />{" "}
                              Phone
                            </span>
                            <input
                              className={inputClassName}
                              type="tel"
                              autoComplete="tel"
                              value={branchPhone}
                              readOnly={!ownsEditLock(branchLock, "Branch", branch._id)}
                              onFocus={() => beginEditing(branchLock, "Branch", branch._id, setBranchFeedback)}
                              onChange={(event) =>
                                setBranchPhone(event.target.value)
                              }
                              placeholder="Optional"
                            />
                          </label>
                          <label className="block space-y-1.5 text-sm font-medium">
                            <span className="inline-flex items-center gap-2">
                              <Mail size={16} className="text-[#0A8B8E]" />{" "}
                              Contact email
                            </span>
                            <input
                              className={inputClassName}
                              type="email"
                              autoComplete="email"
                              value={branchEmail}
                              readOnly={!ownsEditLock(branchLock, "Branch", branch._id)}
                              onFocus={() => beginEditing(branchLock, "Branch", branch._id, setBranchFeedback)}
                              onChange={(event) =>
                                setBranchEmail(event.target.value)
                              }
                              placeholder="Optional"
                            />
                          </label>
                          {branchFeedback && (
                            <p
                              role={
                                branchFeedback.toLowerCase().includes("saved")
                                  ? "status"
                                  : "alert"
                              }
                              className={feedbackClassName(branchFeedback)}
                            >
                              {branchFeedback}
                            </p>
                          )}
                          <button
                            type="submit"
                            disabled={isSavingBranch || branchLock.isBlocked("Branch", branch._id)}
                            className={buttonClassName}
                          >
                            {isSavingBranch
                              ? "Saving..."
                              : "Save branch details"}
                          </button>
                        </form>
                      ) : (
                        <p className="rounded-xl bg-[#FBF6EF] p-4 text-sm text-gray-600 dark:bg-neutral-950 dark:text-gray-300">
                          No branch is assigned to your account yet.
                        </p>
                      )}
                    </section>
                  )}

                  {isAdmin && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-xl bg-[#F2C879]/25 p-2.5 text-[#8A641B]">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold">Account sign-in</h3>
                          <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                            Choose how admins and staff can access their
                            accounts.
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between gap-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                        onContextMenu={(event) => showIntegrationContextMenu(event, "staffGoogleAuthEnabled")}
                      >
                        <div>
                          <p className="text-sm font-medium">Google sign-in</p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {accountsWithoutPassword > 0 && googleAuthEnabled
                              ? `Set passwords for all ${accountsWithoutPassword} account${accountsWithoutPassword === 1 ? "" : "s"} without a password before turning off Google sign-in.`
                              : googleAuthEnabled
                                ? "Admins and staff can use their approved Google account."
                                : "All accounts must sign in with email and password."}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={googleAuthEnabled}
                          aria-label="Enable Google sign-in for all accounts"
                          onClick={toggleGoogleAuth}
                          disabled={
                            isSavingGoogleSetting ||
                            (googleAuthEnabled && accountsWithoutPassword > 0)
                          }
                          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${googleAuthEnabled ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${googleAuthEnabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      {googleFeedback && (
                        <p
                          role={
                            googleFeedback.toLowerCase().includes("saved")
                              ? "status"
                              : "alert"
                          }
                          className={`mt-3 ${feedbackClassName(googleFeedback)}`}
                        >
                          {googleFeedback}
                        </p>
                      )}
                      {isSuperAdmin && (
                        <div className="mt-5 rounded-xl bg-[#FBF6EF] p-4 text-sm text-gray-600 dark:bg-neutral-950 dark:text-gray-300">
                          Right-click a credential-backed integration below to edit or remove its credential override. Changing Google OAuth credentials may require users to reconnect.
                          {!credentialEncryptionConfigured && (
                            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              Set INTEGRATION_CREDENTIALS_ENCRYPTION_KEY in the server deployment environment before managing credentials.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-4 space-y-3">
                        {Object.entries(integrationLabels).map(([setting, label]) => (
                          <div
                            key={setting}
                            className="flex items-center justify-between gap-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
                            onContextMenu={(event) => showIntegrationContextMenu(event, setting)}
                          >
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                {integrationSettings[setting] ? `${label} is available to all accounts.` : `${label} is disabled for all accounts.`}
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(integrationSettings[setting])}
                              aria-label={`Enable ${label}`}
                              onClick={() => toggleIntegration(setting)}
                              disabled={savingIntegration === setting || !authSettingsLoaded}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${integrationSettings[setting] ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
                            >
                              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${integrationSettings[setting] ? "left-6" : "left-1"}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950">
                        <div>
                          <p className="text-sm font-medium">
                            Activity logging
                          </p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {activityLoggingEnabled
                              ? "Records system activity for audit review. Turning this off pauses all activity records except the setting-change record."
                              : "Paused. The setting-change record is still retained; other activity will not be recorded."}{" "}
                            Changes can take up to 30 seconds to reach other
                            server instances.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={activityLoggingEnabled}
                          aria-label="Enable activity logging"
                          onClick={toggleActivityLogging}
                          disabled={
                            isSavingActivityLogging || !authSettingsLoaded
                          }
                          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${activityLoggingEnabled ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${activityLoggingEnabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      {activityLoggingFeedback && (
                        <p
                          role={
                            activityLoggingFeedback
                              .toLowerCase()
                              .includes("saved")
                              ? "status"
                              : "alert"
                          }
                          className={`mt-3 ${feedbackClassName(activityLoggingFeedback)}`}
                        >
                          {activityLoggingFeedback}
                        </p>
                      )}
                    </section>
                  )}
                </div>
              </section>
            </div>
          </FadeIn>
        )}
        <AnimatePresence>{initialLoading && <StreakBar />}</AnimatePresence>
        {integrationContextMenu && (
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setIntegrationContextMenu(null)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div
              role="menu"
              className="fixed min-w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
              style={{ left: integrationContextMenu.x, top: integrationContextMenu.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => openCredentialEditor(integrationContextMenu.integration, "replace")}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                Edit credentials
              </button>
              {credentialStatuses[integrationContextMenu.integration]?.hasOverride && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openCredentialEditor(integrationContextMenu.integration, "remove")}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  Remove credential override
                </button>
              )}
            </div>
          </div>
        )}
        <AnimatePresence>
          {pendingIntegrationChange && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget
                  && !isSavingGoogleSetting
                  && !savingIntegration
                ) {
                  cancelIntegrationChange();
                }
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="integration-change-title"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
              >
                <div>
                  <h3 id="integration-change-title" className="text-lg font-semibold">
                    {pendingIntegrationChange.enabled ? "Enable" : "Disable"}{" "}
                    {pendingIntegrationChange.setting === "staffGoogleAuthEnabled"
                      ? "Google sign-in"
                      : integrationLabels[pendingIntegrationChange.setting]}?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {integrationDescriptions[pendingIntegrationChange.setting]}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    This change applies to all accounts, including yours.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelIntegrationChange}
                    disabled={isSavingGoogleSetting || Boolean(savingIntegration)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-neutral-700 dark:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmIntegrationChange}
                    disabled={isSavingGoogleSetting || Boolean(savingIntegration)}
                    className={buttonClassName}
                  >
                    {isSavingGoogleSetting || savingIntegration
                      ? "Saving..."
                      : `Confirm ${pendingIntegrationChange.enabled ? "enable" : "disable"}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {credentialEditor && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !credentialBusy) {
                  closeCredentialEditor();
                }
              }}
            >
              <motion.form
                onSubmit={credentialEditor.step === "account"
                  ? requestCredentialCode
                  : credentialEditor.step === "otp"
                    ? verifyCredentialCode
                    : submitCredentialChange}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
              >
                <div>
                  <h3 className="text-lg font-semibold">
                    {credentialEditor.mode === "remove" ? "Remove credential override" : `Replace ${credentialIntegrations[credentialEditor.integration].label} credentials`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {credentialEditor.step === "account"
                      ? "Enter the configured Super Admin username and PIN to request a verification code."
                      : credentialEditor.step === "otp"
                        ? "Enter the one-time code sent to the Super Admin email."
                        : credentialEditor.mode === "remove"
                          ? "Verification complete. Confirm removal to use deployment credentials again."
                          : "Verification complete. Enter the new credentials for this integration."}
                  </p>
                </div>

                {credentialEditor.step === "account" && (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-neutral-950">
                    <div>
                      <h4 className="text-sm font-semibold">Current credentials</h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Masked values from {credentialStatuses[credentialEditor.integration]?.hasOverride
                          ? "the saved override"
                          : "the deployment configuration"}.
                      </p>
                    </div>
                    <dl className="space-y-2">
                      {Object.entries(credentialIntegrations[credentialEditor.integration].fields).map(([field, label]) => (
                        <div key={field} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                          <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
                          <dd className="font-mono text-gray-900 dark:text-white">
                            {credentialStatuses[credentialEditor.integration]?.maskedValues?.[field]
                              || (credentialStatuses[credentialEditor.integration]
                                ? "Not configured"
                                : "Loading…")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {credentialEditor.step === "account" ? (
                  <div className="space-y-4">
                    <label className="block space-y-1.5 text-sm font-medium">
                      Super Admin username
                      <input
                        className={inputClassName}
                        autoComplete="off"
                        value={credentialUsername}
                        onChange={(event) => setCredentialUsername(event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium">
                      PIN
                      <input
                        className={inputClassName}
                        type="password"
                        autoComplete="off"
                        value={credentialPin}
                        onChange={(event) => setCredentialPin(event.target.value)}
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={credentialBusy}
                      className={buttonClassName}
                    >
                      {credentialBusy ? "Sending code..." : "Verify and send code"}
                    </button>
                  </div>
                ) : credentialEditor.step === "otp" ? (
                  <div className="space-y-4">
                    <label className="block space-y-1.5 text-sm font-medium">
                      Six-digit verification code
                      <input
                        className={inputClassName}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        value={credentialCode}
                        onChange={(event) => setCredentialCode(event.target.value.replace(/\D/g, ""))}
                        required
                      />
                    </label>
                    <button type="submit" disabled={credentialBusy} className={buttonClassName}>
                      {credentialBusy ? "Verifying..." : "Verify code"}
                    </button>
                  </div>
                ) : credentialEditor.mode === "remove" ? (
                  <button type="submit" disabled={credentialBusy} className={buttonClassName}>
                    {credentialBusy ? "Removing..." : "Remove override"}
                  </button>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(credentialIntegrations[credentialEditor.integration].fields).map(([field, label]) => (
                      <label key={field} className="block space-y-1.5 text-sm font-medium">
                        {label}
                        <input
                          className={inputClassName}
                          type={field === "sender" || field === "redirectUri" ? "text" : "password"}
                          autoComplete="off"
                          value={credentialValues[field] || ""}
                          onChange={(event) => {
                            setCredentialValues((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }));
                            if (credentialEditor.integration === "recaptcha") {
                              setCredentialTestToken("");
                              setCredentialCaptchaVersion((current) => current + 1);
                            }
                          }}
                          required
                        />
                      </label>
                    ))}
                    {credentialEditor.integration === "recaptcha" && credentialValues.siteKey && (
                      showCredentialCaptcha ? (
                        <div className="rounded-xl border border-gray-200 p-3 dark:border-neutral-700">
                          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                            Complete a fresh reCAPTCHA challenge to verify this site key and secret.
                          </p>
                          <ReCAPTCHA
                            key={credentialCaptchaVersion}
                            sitekey={credentialValues.siteKey.trim()}
                            onChange={(token) => setCredentialTestToken(token || "")}
                            onExpired={() => setCredentialTestToken("")}
                            onErrored={() => {
                              setCredentialTestToken("");
                              toast.error("The reCAPTCHA site key could not load a challenge.");
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCredentialCaptcha(true)}
                          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-700"
                        >
                          Load reCAPTCHA test
                        </button>
                      )
                    )}
                    {credentialEditor.integration === "googleAuth" && credentialValues.clientId ? (
                      <GoogleOAuthProvider clientId={credentialValues.clientId.trim()}>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Sign in with the Super Admin Google account to validate this client ID.
                          </p>
                          <GoogleLogin
                            onSuccess={(response) => {
                              if (!response.credential) {
                                toast.error("Google did not return a sign-in token.");
                                return;
                              }
                              submitCredentialChange(undefined, { idToken: response.credential });
                            }}
                            onError={() => toast.error("Google sign-in validation failed.")}
                          />
                        </div>
                      </GoogleOAuthProvider>
                    ) : credentialEditor.integration !== "googleAuth" ? (
                      <button
                        type="submit"
                        disabled={credentialBusy || (credentialEditor.integration === "recaptcha" && !credentialTestToken)}
                        className={buttonClassName}
                      >
                        {credentialBusy
                          ? "Validating..."
                          : credentialEditor.integration === "gmail"
                            ? "Send test email and save"
                            : ["googleDrive", "googleCalendar", "googleSheets"].includes(credentialEditor.integration)
                              ? "Connect Google and validate"
                              : "Validate and save"}
                      </button>
                    ) : null}
                    {credentialEditor.integration === "googleSheets" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This checks OAuth credentials and the Sheets permission. The Sheets API itself is exercised when a report is exported.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <button
                    type="button"
                    disabled={credentialBusy}
                    onClick={closeCredentialEditor}
                    className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}
