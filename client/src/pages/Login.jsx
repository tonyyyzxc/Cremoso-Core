import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { GoogleLogin } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";
import { fadeTransition } from "../components/loadingVariants.js";
import {
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useToast } from "../hooks/UseToast.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const inputClass =
  "h-14 w-full rounded-2xl border border-[#E4ECEB] bg-[#FBFCFC] pr-4 text-[15px] text-[#0A3B3D] placeholder:text-[#9AAAAB] outline-none transition duration-200 focus:border-[#0A8B8E] focus:bg-white focus:ring-4 focus:ring-[#0A8B8E]/15";

const passwordResetSteps = [
  { label: "Email", Icon: Mail },
  { label: "Code", Icon: ClipboardCheck },
  { label: "Password", Icon: LockKeyhole },
];

const slideVariants = {
  enter: (direction) => ({ opacity: 0, x: `${direction * 100}%` }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: `${direction * -100}%` }),
};

function Login() {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [loginIntegrations, setLoginIntegrations] = useState({
    staffGoogleAuthEnabled: false,
    recaptchaEnabled: true,
    gmailEnabled: true,
    recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || "",
    loaded: false,
  });
  const [resetStep, setResetStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(300);
  const [recaptchaScale, setRecaptchaScale] = useState(1);
  const authRequestRef = useRef(false);
  const toast = useToast();
  const recaptchaRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const googleContainerRef = useRef(null);

  // Prevents page scrolling while the login page is mounted.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    fetch(`${API_URL}/api/auth-settings/public`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error("Unable to load public sign-in settings.");
        return response.json();
      })
      .then((config) =>
        setLoginIntegrations((current) => ({
          ...current,
          ...config,
          recaptchaSiteKey:
            config.recaptchaSiteKey ||
            import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
            "",
          loaded: true,
        })),
      )
      .catch((err) => {
        if (isCancelled) return;
        console.error("Public sign-in settings error:", err);
        setLoginIntegrations((current) => ({ ...current, loaded: true }));
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Keeps the reCAPTCHA widget scaled to the form width.
  useEffect(() => {
    const container = recaptchaContainerRef.current;
    if (!container) return undefined;

    const updateScale = () => {
      if (!container.clientWidth) return;
      setRecaptchaScale(Math.min(container.clientWidth / 304, 1.25));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, [isForgotPassword]);

  // Sets the Google button width to match the form width.
  useEffect(() => {
    const container = googleContainerRef.current;
    if (!container) return undefined;

    const updateWidth = () => {
      if (!container.clientWidth) return;
      setGoogleButtonWidth(Math.min(Math.floor(container.clientWidth), 400));
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    updateWidth();

    return () => observer.disconnect();
  }, [loginIntegrations.loaded, loginIntegrations.staffGoogleAuthEnabled]);

  const resetFlowFields = () => {
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (authRequestRef.current) return;
    if (resetStep === 2 && newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    authRequestRef.current = true;
    setIsSubmitting(true);
    try {
      const endpoint = [
        "forgot-password",
        "verify-reset-code",
        "reset-password",
      ][resetStep];
      const body = [
        { email: forgotEmail },
        { email: forgotEmail, code: resetCode },
        { email: forgotEmail, code: resetCode, newPassword },
      ][resetStep];
      const result = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        toast.error(data.error || "Unable to reset your password.");
        return;
      }

      if (resetStep < passwordResetSteps.length - 1) {
        toast.success(
          resetStep === 0
            ? "If an active account exists, a reset code has been sent."
            : "Code verified. Set your new password.",
        );
        setDirection(1);
        setResetStep((currentStep) => currentStep + 1);
        return;
      }

      toast.success(data.message || "Password reset successfully.");
      setIdentifier(forgotEmail);
      setIsForgotPassword(false);
      setResetStep(0);
      resetFlowFields();
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      authRequestRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Password login returns { token, user }.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (authRequestRef.current) return;
    if (
      loginIntegrations.recaptchaEnabled &&
      !loginIntegrations.recaptchaSiteKey
    ) {
      toast.error(
        "reCAPTCHA is not configured. Please contact an administrator.",
      );
      return;
    }
    if (loginIntegrations.recaptchaEnabled && !recaptchaToken) {
      toast.error("Please complete the reCAPTCHA check.");
      return;
    }
    authRequestRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          recaptchaToken: loginIntegrations.recaptchaEnabled
            ? recaptchaToken
            : "",
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        toast.error(data.error || "Email or password is incorrect.");
        return;
      }

      if (!data.token || !data.user?.id) {
        toast.error("Login response is missing the session token or user.");
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Signed in successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Email/password login error:", err);
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      authRequestRef.current = false;
      setIsSubmitting(false);
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    }
  };

  // Google returns a signed ID token (credential). Send it to the server,
  // which verifies it and issues the app's own session token.
  const handleGoogleSuccess = async (response) => {
    if (authRequestRef.current) return;
    if (!response?.credential) {
      toast.error("Google sign-in did not return a credential. Try again.");
      return;
    }

    authRequestRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server expects this exact property name: idToken.
        body: JSON.stringify({ idToken: response.credential }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        toast.error(data.error || "Google sign-in failed.");
        return;
      }

      if (!data.token || !data.user?.id) {
        toast.error(
          "Google sign-in response is missing the session token or user.",
        );
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Signed in successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      authRequestRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error("Google sign-in error:", error);
    toast.error("Google sign-in failed. Try again.");
  };

  const showGoogleSignIn =
    !isForgotPassword &&
    loginIntegrations.loaded &&
    loginIntegrations.staffGoogleAuthEnabled;
  const googleClientId = loginIntegrations.googleClientId || GOOGLE_CLIENT_ID;
  const isLoginFormInvalid = !identifier.trim() || !password;
  const isPasswordResetFormInvalid =
    resetStep === 0
      ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())
      : resetStep === 1
        ? !/^\d{6}$/.test(resetCode)
        : newPassword.length < 8 || newPassword !== confirmPassword;
  const isSubmitDisabled =
    isSubmitting ||
    !loginIntegrations.loaded ||
    (isForgotPassword
      ? isPasswordResetFormInvalid
      : isLoginFormInvalid ||
        (loginIntegrations.recaptchaEnabled &&
          (!loginIntegrations.recaptchaSiteKey || !recaptchaToken)));

  const enterForgotPassword = () => {
    setForgotEmail(identifier.includes("@") ? identifier : "");
    setIsForgotPassword(true);
    setResetStep(0);
    resetFlowFields();
    setDirection(1);
  };

  const leaveForgotPassword = () => {
    setIsForgotPassword(false);
    setResetStep(0);
    resetFlowFields();
    setIdentifier(forgotEmail);
    setPassword("");
    setRecaptchaToken("");
    recaptchaRef.current?.reset();
    setDirection(1);
  };

  const submitLabel = isSubmitting
    ? "Please wait..."
    : isForgotPassword
      ? ["Send code", "Verify code", "Reset password"][resetStep]
      : "Log in";

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#FAF5EC] px-4 py-4">
        {/* Ambient background */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -left-24 -top-24 h-105 w-105 rounded-full bg-[#0A8B8E]/25 blur-3xl animate-[drift1_16s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-16 h-85 w-85 rounded-full bg-[#F2C879]/35 blur-3xl animate-[drift2_20s_ease-in-out_infinite]" />
          <div className="absolute bottom-[10%] left-[8%] h-65 w-65 rounded-full bg-[#0A8B8E]/15 blur-3xl animate-[drift3_18s_ease-in-out_infinite]" />
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="bubble absolute -bottom-6 rounded-full bg-linear-to-br from-[#0A8B8E]/40 to-[#0A8B8E]/5"
              style={{
                left: `${(i * 9.7) % 100}%`,
                animationDelay: `${i * 1.3}s`,
                animationDuration: `${10 + (i % 5)}s`,
                width: `${6 + (i % 4) * 3}px`,
                height: `${6 + (i % 4) * 3}px`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-40px) scale(1.08); } 66% { transform: translate(-20px,20px) scale(.95); } }
          @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,-30px) scale(1.1); } }
          @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(25px,35px) scale(1.05); } 70% { transform: translate(-30px,-15px) scale(.92); } }
          @keyframes rise { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: .5; } 90% { opacity: .35; } 100% { transform: translateY(-100vh) translateX(15px); opacity: 0; } }
          .bubble { animation-name: rise; animation-timing-function: ease-in; animation-iteration-count: infinite; }
          @media (prefers-reduced-motion: reduce) { .bubble, [class*="animate-[drift"] { animation: none !important; } }
        `}</style>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...fadeTransition, delay: 0.15 }}
          className="relative z-10 grid max-h-full w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-[2.25rem] border border-white/70 bg-white shadow-[0_30px_80px_-20px_rgba(6,63,64,0.35)] md:grid-cols-[1.05fr_1fr] md:overflow-hidden"
        >
          {/* Brand panel */}
          <div className="relative isolate flex flex-col items-center justify-center overflow-hidden bg-linear-to-br from-[#2BB5B2] via-[#0A8B8E] to-[#063F40] px-8 py-10 text-center text-white md:py-14">
            <div className="pointer-events-none absolute -left-40 -top-44 -z-10 h-130 w-130 rounded-full border border-white/15" />
            <div className="pointer-events-none absolute -bottom-40 -right-32 -z-10 h-95 w-95 rounded-full border border-white/15" />

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                filter: "drop-shadow(0 0 18px rgba(45, 212, 191, 0.3))",
              }}
              className="group relative z-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_20px_40px_-18px_rgba(0,0,0,.35)] backdrop-blur-sm md:h-28 md:w-28"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <img
                src="/android-chrome-512x512.png"
                alt="Cremoso icon"
                className="h-16 w-16 brightness-0 invert md:h-20 md:w-20"
              />
            </motion.div>

            <h1 className="relative z-10 mt-7 font-serif text-4xl font-bold uppercase leading-none tracking-[0.14em] md:text-5xl">
              Cremoso
            </h1>

            <p className="relative z-10 mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/95 md:text-xs">
              Soft-Serve <span className="mx-1.5 opacity-60">•</span> Frozen
              Yogurt <span className="mx-1.5 opacity-60">•</span> Iced Coffee
            </p>

            <p className="relative z-10 mt-3 text-xs tracking-wide text-white/70">
              By Ahavah &amp; The Backyard
            </p>
          </div>

          {/* Form panel */}
          <div
            className={`flex flex-col justify-center bg-white px-7 sm:px-10 md:px-12 ${
              isForgotPassword ? "py-8" : "py-8 md:py-12"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A8B8E]">
              {isForgotPassword ? "Account recovery" : "Welcome back"}
            </p>
            <h2 className="mt-2 font-serif text-[2.1rem] font-semibold leading-tight text-[#0A3B3D]">
              {isForgotPassword
                ? "Reset your password"
                : "Log in to your account"}
            </h2>
            <p className="mt-2 text-sm text-[#6B7D7E]">
              {isForgotPassword
                ? [
                    "Enter the email address linked to your account.",
                    "Enter the 6-digit code sent to your email.",
                    "Choose and confirm your new password.",
                  ][resetStep]
                : "Sign in to manage orders, menus and your cup of the day."}
            </p>

            <form
              onSubmit={isForgotPassword ? handlePasswordReset : handleSubmit}
              className="mt-8 space-y-4"
            >
              <div
                className={`relative -mx-1 overflow-x-clip px-1 ${isForgotPassword ? "min-h-53" : ""}`}
              >
                <AnimatePresence
                  mode="popLayout"
                  initial={false}
                  custom={direction}
                >
                  <motion.div
                    key={isForgotPassword ? `reset-${resetStep}` : "login"}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="space-y-4"
                  >
                    {!isForgotPassword && (
                      <>
                        <div className="relative">
                          <Mail
                            size={18}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAAAB]"
                          />
                          <input
                            type="text"
                            placeholder="Username or email"
                            autoComplete="username"
                            value={identifier}
                            onChange={(event) =>
                              setIdentifier(event.target.value)
                            }
                            className={`${inputClass} pl-12`}
                            required
                          />
                        </div>

                        <div className="relative">
                          <LockKeyhole
                            size={18}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAAAB]"
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                            className={`${inputClass} pl-12 pr-12`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((visible) => !visible)
                            }
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            aria-pressed={showPassword}
                            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[#9AAAAB] transition hover:bg-[#0A8B8E]/10 hover:text-[#0A8B8E] focus-visible:outline-2 focus-visible:outline-[#0A8B8E]"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>

                        {loginIntegrations.gmailEnabled && (
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={enterForgotPassword}
                              className="text-sm font-semibold text-[#0A8B8E] transition hover:text-[#066E70] hover:underline underline-offset-4"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {isForgotPassword && resetStep === 0 && (
                      <div className="relative">
                        <Mail
                          size={18}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAAAB]"
                        />
                        <input
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          value={forgotEmail}
                          onChange={(event) =>
                            setForgotEmail(event.target.value)
                          }
                          className={`${inputClass} pl-12`}
                          required
                        />
                      </div>
                    )}

                    {isForgotPassword && resetStep === 1 && (
                      <div className="space-y-3">
                        <p className="text-sm text-[#6B7D7E]">
                          Check your inbox for the reset code.
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          placeholder="6-digit code"
                          value={resetCode}
                          onChange={(event) =>
                            setResetCode(event.target.value.replace(/\D/g, ""))
                          }
                          className={`${inputClass} pl-4 text-center font-semibold tracking-[0.4em]`}
                          required
                        />
                      </div>
                    )}

                    {isForgotPassword && resetStep === 2 && (
                      <div className="space-y-4">
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="New password (at least 8 characters)"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          className={`${inputClass} pl-4`}
                          required
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          className={`${inputClass} pl-4`}
                          required
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {isForgotPassword && (
                <FlowStepper step={resetStep} steps={passwordResetSteps} />
              )}

              {!isForgotPassword && loginIntegrations.recaptchaEnabled && (
                <div className="space-y-1">
                  {loginIntegrations.recaptchaSiteKey ? (
                    <div
                      ref={recaptchaContainerRef}
                      className="w-full overflow-hidden"
                      style={{ height: `${78 * recaptchaScale}px` }}
                    >
                      <div
                        style={{
                          width: 304,
                          height: 78,
                          transform: `scale(${recaptchaScale})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={loginIntegrations.recaptchaSiteKey}
                          onChange={(token) => setRecaptchaToken(token || "")}
                          onExpired={() => setRecaptchaToken("")}
                        />
                      </div>
                    </div>
                  ) : (
                    <p
                      className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                      role="alert"
                    >
                      reCAPTCHA is not configured. Please contact an
                      administrator.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {isForgotPassword && resetStep > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setDirection(-1);
                      setResetStep((currentStep) => currentStep - 1);
                    }}
                    className="h-14 rounded-2xl border border-[#E4ECEB] px-6 font-semibold text-[#0A3B3D] transition hover:bg-[#FAF6F0] disabled:opacity-60"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="group relative h-14 flex-1 overflow-hidden rounded-2xl bg-linear-to-br from-[#14A3A5] via-[#0A8B8E] to-[#066E70] font-semibold tracking-wide text-white shadow-lg shadow-[#0A8B8E]/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#0A8B8E]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{submitLabel}</span>
                </button>
              </div>
            </form>

            {showGoogleSignIn && (
              <>
                <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[#9AAAAB]">
                  <div className="h-px flex-1 bg-[#E4ECEB]" />
                  <span>Or continue with</span>
                  <div className="h-px flex-1 bg-[#E4ECEB]" />
                </div>
                <div
                  ref={googleContainerRef}
                  aria-busy={isSubmitting}
                  className={`flex w-full justify-center transition ${isSubmitting ? "pointer-events-none opacity-60" : ""}`}
                >
                  {googleClientId ? (
                    <GoogleLogin
                      locale="en"
                      text="continue_with"
                      use_fedcm_for_button={true}
                      width={googleButtonWidth}
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                    />
                  ) : (
                    <p
                      className="text-center text-sm text-red-700"
                      role="alert"
                    >
                      Google sign-in is not configured. Please contact an
                      administrator.
                    </p>
                  )}
                </div>
              </>
            )}

            {isForgotPassword && (
              <p className="mt-6 text-center text-sm text-[#6B7D7E]">
                Remembered your password?{" "}
                <button
                  type="button"
                  onClick={leaveForgotPassword}
                  className="font-semibold text-[#0A8B8E] hover:text-[#066E70] hover:underline underline-offset-4"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

function FlowStepper({ step, steps }) {
  return (
    <ol className="flex pt-2">
      {steps.map(({ label, Icon }, index) => {
        const done = index < step;
        const active = index === step;
        const isLast = index === steps.length - 1;
        const lineFill = done ? 100 : active ? 50 : 0;
        return (
          <li
            key={label}
            className={isLast ? "" : "flex-1"}
            aria-current={active ? "step" : undefined}
          >
            <div className="flex items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-[#0A8B8E] text-white ring-4 ring-[#0A8B8E]/20"
                      : "border-2 border-dashed border-[#D5DFDE] text-[#9AAAAB]"
                }`}
              >
                {done ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Icon size={16} aria-hidden="true" />
                )}
              </div>
              {!isLast && (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded bg-[#E4ECEB]">
                  <motion.div
                    className={`h-full ${done ? "bg-emerald-500" : "bg-[#0A8B8E]"}`}
                    animate={{ width: `${lineFill}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[#9AAAAB]">
              Step {index + 1}
            </p>
            <p
              className={`text-sm font-semibold ${done || active ? "text-[#0A3B3D]" : "text-[#9AAAAB]"}`}
            >
              {label}
            </p>
            <span
              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${
                done
                  ? "bg-emerald-50 text-emerald-700"
                  : active
                    ? "bg-[#0A8B8E]/10 text-[#0A8B8E]"
                    : "bg-[#F1F5F4] text-[#9AAAAB]"
              }`}
            >
              {done ? "Completed" : active ? "In progress" : "Pending"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default Login;
