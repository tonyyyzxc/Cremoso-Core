import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { GoogleLogin } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";
import { fadeTransition } from "../components/loadingVariants.js";
import {
  Check,
  ClipboardCheck,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useToast } from "../hooks/UseToast.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-[#FAF6F0] py-3 px-4 text-[#0A3B3D] placeholder-gray-400 transition focus:border-[#0A8B8E] focus:outline-none focus:ring-2 focus:ring-[#0A8B8E]/20";

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
  const toast = useToast();
  const recaptchaRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const googleContainerRef = useRef(null);
  const [recaptchaScale, setRecaptchaScale] = useState(1);

  // Prevents page scrolling while the login page is mounted.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/auth-settings/public`)
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
        console.error("Public sign-in settings error:", err);
        setLoginIntegrations((current) => ({ ...current, loaded: true }));
      });
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

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (resetStep === 2 && newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

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
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password login returns { token, user }.
  const handleSubmit = async (event) => {
    event.preventDefault();
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
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        toast.error(data.error || "Email or password is incorrect.");
        return;
      }

      if (!data.token || !data.user) {
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
      setIsSubmitting(false);
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    }
  };

  // Google returns a signed ID token (credential). Send it to the server,
  // which verifies it and issues the app's own session token.
  const handleGoogleSuccess = async (response) => {
    try {
      const result = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server expects this exact property name: idToken.
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        toast.error(data.error || "Google sign-in failed.");
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Signed in successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Unable to reach the server. Please try again.");
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

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh bg-[#FBF6EF] flex items-center justify-center px-4 py-4 overflow-hidden">
        {/* Animated background layer */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="bubble"
              style={{
                left: `${(i * 8.3) % 100}%`,
                animationDelay: `${i * 1.1}s`,
                animationDuration: `${9 + (i % 5)}s`,
                width: `${6 + (i % 4) * 3}px`,
                height: `${6 + (i % 4) * 3}px`,
              }}
            />
          ))}
        </div>

        <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, -30px) scale(1.1); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(25px, 35px) scale(1.05); }
          70% { transform: translate(-30px, -15px) scale(0.92); }
        }
        @keyframes rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.35; }
          100% { transform: translateY(-100vh) translateX(15px); opacity: 0; }
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.35;
        }
        .blob-1 {
          width: 420px; height: 420px;
          top: -100px; left: -100px;
          background: #0A8B8E;
          animation: drift1 16s ease-in-out infinite;
        }
        .blob-2 {
          width: 320px; height: 320px;
          bottom: -80px; right: -60px;
          background: #F2C879;
          opacity: 0.3;
          animation: drift2 20s ease-in-out infinite;
        }
        .blob-3 {
          width: 260px; height: 260px;
          bottom: 10%; left: 8%;
          background: #0A8B8E;
          opacity: 0.15;
          animation: drift3 18s ease-in-out infinite;
        }
        .bubble {
          position: absolute;
          bottom: -20px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(10,139,142,0.5), rgba(10,139,142,0.1));
          animation-name: rise;
          animation-timing-function: ease-in;
          animation-iteration-count: infinite;
        }
      `}</style>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...fadeTransition, delay: 0.15 }}
          className="relative z-10 grid max-h-full w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-[2.5rem] bg-white shadow-xl shadow-[#0A8B8E]/10 md:grid-cols-2 md:overflow-hidden"
        >
          {/* Left panel: brand / illustration side, mirrors the Cremoso logo layout */}
          <div
            className={`relative hidden flex-col items-center justify-center overflow-hidden bg-[#0A8B8E] px-8 md:flex ${
              !isForgotPassword ? "pt-20 pb-14 md:pt-0 md:pb-0" : "py-14 md:py-0"
            }`}
          >
            {/* Soft-serve swirl icon */}
            <img
              src="/android-chrome-512x512.png"
              alt="Cremoso icon"
              className="relative z-10 w-28 md:w-32 h-auto mb-4 brightness-0 invert"
            />

            {/* Wordmark */}
            <h1 className="relative z-10 text-white text-4xl md:text-5xl font-serif font-bold tracking-wide text-center">
              CREMOSO
            </h1>

            {/* Tagline */}
            <p className="relative z-10 text-white text-xs md:text-sm font-semibold tracking-wide mt-3 text-center">
              SOFT-SERVE&nbsp;|&nbsp;FROZEN YOGURT&nbsp;|&nbsp;ICED COFFEE
            </p>

            {/* Sub-tagline */}
            <p className="relative z-10 text-[#FBF6EF]/70 text-xs tracking-wide mt-1 text-center">
              By Ahavah &amp; The Backyard
            </p>
          </div>

          {/* Right panel: form side */}
          <div
            className={`flex flex-col justify-center px-6 sm:px-8 md:px-12 ${
              !isForgotPassword ? "pt-8 pb-8 md:pt-16" : "py-8"
            }`}
          >
            <h2 className="text-[#0A3B3D] text-2xl font-semibold mb-1">
              {isForgotPassword ? "Reset your password" : "Welcome!"}
            </h2>
            <p className="text-gray-500 text-sm mb-7">
              {isForgotPassword
                ? [
                    "Enter the email address linked to your account.",
                    "Enter the 6-digit code sent to your email.",
                    "Choose and confirm your new password.",
                  ][resetStep]
                : "Login to your Cremoso account"}
            </p>

            <form
              onSubmit={isForgotPassword ? handlePasswordReset : handleSubmit}
              className="space-y-3.5"
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
                    className="space-y-3.5"
                  >
                    {!isForgotPassword && (
                      <>
                        <div className="relative">
                          <Mail
                            size={18}
                            aria-hidden="true"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Username or email"
                            autoComplete="username"
                            value={identifier}
                            onChange={(event) => setIdentifier(event.target.value)}
                            className={`${inputClass} pl-11`}
                            required
                          />
                        </div>
                        <div className="relative">
                          <LockKeyhole
                            size={18}
                            aria-hidden="true"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                            className={`${inputClass} pl-11 pr-12`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((visible) => !visible)
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A8B8E] transition"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            <EyeIcon open={showPassword} />
                          </button>
                        </div>
                        {loginIntegrations.gmailEnabled && (
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setForgotEmail(
                                  identifier.includes("@") ? identifier : "",
                                );
                                setIsForgotPassword(true);
                                setResetStep(0);
                                setResetCode("");
                                setNewPassword("");
                                setConfirmPassword("");
                                setDirection(1);
                              }}
                              className="text-sm font-medium text-[#0A8B8E] hover:underline"
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
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          value={forgotEmail}
                          onChange={(event) =>
                            setForgotEmail(event.target.value)
                          }
                          className={`${inputClass} pl-11`}
                          required
                        />
                      </div>
                    )}
                    {isForgotPassword && resetStep === 1 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">
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
                          className={`${inputClass} text-center tracking-[0.3em]`}
                          required
                        />
                      </div>
                    )}
                    {isForgotPassword && resetStep === 2 && (
                      <>
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="New password (at least 8 characters)"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          className={inputClass}
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
                          className={inputClass}
                          required
                        />
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              {isForgotPassword && (
                <FlowStepper step={resetStep} steps={passwordResetSteps} />
              )}
              {!isForgotPassword &&
                loginIntegrations.recaptchaEnabled && (
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
                      <p className="text-sm text-red-700" role="alert">
                        reCAPTCHA is not configured. Please contact an
                        administrator.
                      </p>
                    )}
                  </div>
                )}
              <div className="flex gap-3">
                {isForgotPassword && resetStep > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(-1);
                      setResetStep((currentStep) => currentStep - 1);
                    }}
                    className="rounded-xl border border-gray-200 px-5 py-3 font-medium text-[#0A3B3D] transition hover:bg-[#FAF6F0]"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !loginIntegrations.loaded ||
                    (!isForgotPassword &&
                      loginIntegrations.recaptchaEnabled &&
                      (!loginIntegrations.recaptchaSiteKey || !recaptchaToken))
                  }
                  className="flex-1 bg-[#0A8B8E] text-white font-medium py-3 rounded-xl shadow-sm hover:bg-[#097578] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Please wait..."
                    : isForgotPassword
                      ? ["Send code", "Verify code", "Reset password"][resetStep]
                      : "Login"}
                </button>
              </div>
            </form>

            {showGoogleSignIn && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    Or continue with
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div
                  ref={googleContainerRef}
                  className="flex w-full justify-center"
                >
                  {GOOGLE_CLIENT_ID ? (
                    <GoogleLogin
                      locale="en"
                      text="continue_with"
                      width={googleButtonWidth}
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                    />
                  ) : (
                    <p
                      className="text-center text-sm text-red-700"
                      role="alert"
                    >
                      Google sign-in is not configured. Missing
                      VITE_GOOGLE_CLIENT_ID.
                    </p>
                  )}
                </div>
              </>
            )}

            <p className="text-center text-sm text-gray-500 mt-5">
              {isForgotPassword ? (
                <>
                  Remembered your password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetStep(0);
                      setResetCode("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setIdentifier(forgotEmail);
                      setPassword("");
                      setRecaptchaToken("");
                      recaptchaRef.current?.reset();
                      setDirection(1);
                    }}
                    className="font-semibold text-[#0A8B8E] hover:underline"
                  >
                    Back to login
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

function FlowStepper({ step, steps }) {
  return (
    <ol className="flex pt-3">
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
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${done ? "bg-emerald-500 text-white" : active ? "bg-[#0A8B8E] text-white ring-4 ring-[#0A8B8E]/20" : "border-2 border-dashed border-gray-300 text-gray-400"}`}
              >
                {done ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Icon size={16} aria-hidden="true" />
                )}
              </div>
              {!isLast && (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded bg-gray-200">
                  <motion.div
                    className={`h-full ${done ? "bg-emerald-500" : "bg-[#0A8B8E]"}`}
                    animate={{ width: `${lineFill}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Step {index + 1}
            </p>
            <p
              className={`text-sm font-semibold ${done || active ? "text-[#0A3B3D]" : "text-gray-400"}`}
            >
              {label}
            </p>
            <span
              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${done ? "bg-emerald-50 text-emerald-700" : active ? "bg-[#0A8B8E]/10 text-[#0A8B8E]" : "bg-gray-100 text-gray-400"}`}
            >
              {done ? "Completed" : active ? "In Progress" : "Pending"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function EyeIcon({ open, ...props }) {
  return open ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default Login;
