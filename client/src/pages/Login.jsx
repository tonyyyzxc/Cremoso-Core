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
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useToast } from "../hooks/UseToast.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const signupInputClass =
  "w-full rounded-xl border border-gray-200 bg-[#FAF6F0] py-3 px-4 text-[#0A3B3D] placeholder-gray-400 transition focus:border-[#0A8B8E] focus:outline-none focus:ring-2 focus:ring-[#0A8B8E]/20";

const signupSteps = [
  { label: "Branch", Icon: Store },
  { label: "Manager", Icon: UserRound },
  { label: "Review", Icon: ClipboardCheck },
];
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
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoginHelpOpen, setIsLoginHelpOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
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
  const [step, setStep] = useState(0);
  const [resetStep, setResetStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const toast = useToast();
  const hiddenGoogleBtn = useRef(null);
  const recaptchaRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const [recaptchaScale, setRecaptchaScale] = useState(1);
  // BEGIN removable BALLDONTLIE login scores integration.
  const [nbaGames, setNbaGames] = useState([]);
  const [nbaScoresStatus, setNbaScoresStatus] = useState("loading");
  // END removable BALLDONTLIE login scores integration.

  // Optional: prevents page scrolling while the login page is mounted.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/auth-settings/public`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load public sign-in settings.");
        return response.json();
      })
      .then((config) => setLoginIntegrations((current) => ({
        ...current,
        ...config,
        recaptchaSiteKey:
          config.recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY || "",
        loaded: true,
      })))
      .catch(() => setLoginIntegrations((current) => ({ ...current, loaded: true })));
  }, []);

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
  }, [isSignup, isForgotPassword]);

  // BEGIN removable BALLDONTLIE login scores integration.
  useEffect(() => {
    if (isSignup || isForgotPassword) return undefined;

    let active = true;
    const loadScores = async () => {
      try {
        const response = await fetch(`${API_URL}/api/integrations/balldontlie/scores`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load NBA scores.");
        if (active) {
          setNbaGames(data.games || []);
          setNbaScoresStatus("loaded");
        }
      } catch {
        if (active) setNbaScoresStatus("unavailable");
      }
    };

    Promise.resolve().then(loadScores);
    const refreshTimer = window.setInterval(loadScores, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [isSignup, isForgotPassword]);
  // END removable BALLDONTLIE login scores integration.

  const handleSignup = async (event) => {
    event.preventDefault();
    if (step < signupSteps.length - 1) {
      setDirection(1);
      setStep(step + 1);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await fetch(`${API_URL}/api/branch-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerName,
          managerPhone,
          managerEmail,
          password,
          branchName,
          branchPhone,
          branchAddress,
        }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        toast.error(data.error || "Unable to submit your application.");
        return;
      }
      toast.success(data.message || "Branch application submitted.");
      setIsSignup(false);
      setManagerName("");
      setManagerPhone("");
      setBranchName("");
      setBranchPhone("");
      setBranchAddress("");
      setIdentifier("");
      setManagerEmail("");
      setPassword("");
    } catch (err) {
      console.error("Branch signup error:", err);
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (loginIntegrations.recaptchaEnabled && !loginIntegrations.recaptchaSiteKey) {
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
        body: JSON.stringify({ identifier, password, recaptchaToken: loginIntegrations.recaptchaEnabled ? recaptchaToken : "" }),
      });
      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        const message = data.error || "Email or password is incorrect.";
        toast.error(message);
        return;
      }

      if (!data.token || !data.user) {
        const message = "Login response is missing the session token or user.";
        toast.error(message);
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Signed in successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Email/password login error:", err);
      const message = "Unable to reach the server. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    }
  };

  // Google returns a signed credential; send it to our server so the server can verify it
  // and issue the app's own session token.
  const handleGoogleSuccess = async (response) => {
    try {
      const result = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server expects this exact property name: idToken.
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await result.json();

      if (!result.ok) {
        const message = data.error || "Google sign-in failed";
        toast.error(message);
        return;
      }

      // Keep the app session so later API requests can authenticate the signed-in user.
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Signed in successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Something went wrong. Try again.");
    }
  };

  const handleGoogleError = () => {
    const message = "Google sign-in failed. Try again.";
    toast.error(message);
  };

  const triggerGoogleLogin = () => {
    const realButton =
      hiddenGoogleBtn.current?.querySelector('div[role="button"]');
    realButton?.click();
  };

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

        <div className="fixed top-4 right-4 z-30 inline-flex max-w-[calc(100vw-2rem)] items-center rounded-full bg-white px-1.5 py-1 shadow-md shadow-black/15">
          <AnimatePresence initial={false}>
            {isLoginHelpOpen && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="max-w-[calc(100vw-5rem)] overflow-hidden whitespace-nowrap text-sm text-gray-500"
              >
                <span className="block pl-2">
                  Having trouble logging in? Contact{" "}
                  <span className="font-medium text-[#0A8B8E]">Admin</span>
                </span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            aria-label="Login help"
            aria-expanded={isLoginHelpOpen}
            onClick={() => setIsLoginHelpOpen((open) => !open)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            <ShieldCheck size={20} className="text-[#0A8B8E]" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...fadeTransition, delay: 0.15 }}
          className="relative z-10 w-full max-w-4xl max-h-full bg-white rounded-[2.5rem] shadow-xl shadow-[#0A8B8E]/10 overflow-hidden grid md:grid-cols-2"
        >
          {/* Left panel — brand / illustration side, mirrors the Cremoso logo layout */}
          <div
            className={`relative bg-[#0A8B8E] flex flex-col items-center justify-center px-8 overflow-hidden ${
              !isSignup && !isForgotPassword
                ? "pt-20 pb-14 md:pt-0 md:pb-0"
                : "py-14 md:py-0"
            }`}
          >
            {/* BEGIN removable BALLDONTLIE login scores integration. */}
            {!isSignup && !isForgotPassword && (
              <section
                aria-label="Today's NBA scores (Eastern Time)"
                aria-live="polite"
                className="relative z-10 mb-5 w-full max-w-[270px] rounded-2xl border border-white/20 bg-[#08777a]/70 p-3 text-white shadow-sm"
              >
                <h2 className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                  NBA scores · ET
                </h2>
                {nbaScoresStatus === "loading" && (
                  <p className="py-2 text-center text-xs text-white/75">Loading scores...</p>
                )}
                {nbaScoresStatus === "unavailable" && (
                  <p className="py-2 text-center text-xs text-white/75">Scores unavailable</p>
                )}
                {nbaScoresStatus === "loaded" && nbaGames.length === 0 && (
                  <p className="py-2 text-center text-xs text-white/75">No NBA games today (ET)</p>
                )}
                {nbaGames.slice(0, 3).map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between gap-2 border-t border-white/15 py-1.5 text-xs first:border-0"
                  >
                    <span className="font-semibold">{game.visitorTeam}</span>
                    <span className="tabular-nums">
                      {game.visitorScore} - {game.homeScore}
                    </span>
                    <span className="font-semibold">{game.homeTeam}</span>
                    <span className="min-w-16 text-right text-[10px] text-white/70">
                      {game.status || "Scheduled"}
                    </span>
                  </div>
                ))}
              </section>
            )}
            {/* END removable BALLDONTLIE login scores integration. */}

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

          {/* Right panel — form side */}
          <div
            className={`flex flex-col justify-center px-8 md:px-12 ${
              !isSignup && !isForgotPassword ? "pt-16 pb-8" : "py-8"
            }`}
          >
            <h2 className="text-[#0A3B3D] text-2xl font-semibold mb-1">
              {isSignup
                ? "Branch signup"
                : isForgotPassword
                  ? "Reset your password"
                  : "Welcome!"}
            </h2>
            <p className="text-gray-500 text-sm mb-7">
              {isSignup
                ? "Apply to register your branch and branch manager account."
                : isForgotPassword
                  ? [
                      "Enter the email address linked to your account.",
                      "Enter the 6-digit code sent to your email.",
                      "Choose and confirm your new password.",
                    ][resetStep]
                  : "Login to your Cremoso account"}
            </p>

            <form
              onSubmit={
                isSignup
                  ? handleSignup
                  : isForgotPassword
                    ? handlePasswordReset
                    : handleSubmit
              }
              className="space-y-3.5"
            >
              <div
                className={`relative -mx-1 overflow-x-clip px-1 ${isSignup || isForgotPassword ? "min-h-53" : ""}`}
              >
                <AnimatePresence
                  mode="popLayout"
                  initial={false}
                  custom={direction}
                >
                  <motion.div
                    key={
                      isSignup
                        ? `signup-${step}`
                        : isForgotPassword
                          ? `reset-${resetStep}`
                          : "login"
                    }
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="space-y-3.5"
                  >
                    {isSignup && step === 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0A8B8E]">
                          Branch details
                        </p>
                        <input
                          value={branchName}
                          onChange={(event) =>
                            setBranchName(event.target.value)
                          }
                          placeholder="Branch name"
                          autoComplete="organization"
                          className={signupInputClass}
                          required
                        />
                        <input
                          value={branchAddress}
                          onChange={(event) =>
                            setBranchAddress(event.target.value)
                          }
                          placeholder="Branch address"
                          autoComplete="street-address"
                          className={signupInputClass}
                        />
                        <input
                          type="tel"
                          value={branchPhone}
                          onChange={(event) =>
                            setBranchPhone(event.target.value)
                          }
                          placeholder="Branch phone (optional)"
                          autoComplete="tel"
                          className={signupInputClass}
                        />
                      </>
                    )}
                    {isSignup && step === 1 && (
                      <>
                        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[#0A8B8E]">
                          Branch manager account
                        </p>
                        <div className="relative">
                          <UserRound
                            size={18}
                            aria-hidden="true"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            value={managerName}
                            onChange={(event) =>
                              setManagerName(event.target.value)
                            }
                            placeholder="Manager name"
                            autoComplete="name"
                            className={`${signupInputClass} pl-11`}
                            required
                          />
                        </div>
                      </>
                    )}
                    {!isForgotPassword && (!isSignup || step === 1) && (
                      <>
                        <div className="relative">
                          <Mail
                            size={18}
                            aria-hidden="true"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type={isSignup ? "email" : "text"}
                            placeholder={
                              isSignup
                                ? "Manager login email"
                                : "Username or email"
                            }
                            autoComplete={isSignup ? "email" : "username"}
                            value={isSignup ? managerEmail : identifier}
                            onChange={(event) =>
                              isSignup
                                ? setManagerEmail(event.target.value)
                                : setIdentifier(event.target.value)
                            }
                            className={`${signupInputClass} pl-11`}
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
                            placeholder={
                              isSignup
                                ? "Create password (at least 8 characters)"
                                : "Password"
                            }
                            autoComplete={
                              isSignup ? "new-password" : "current-password"
                            }
                            minLength={isSignup ? 8 : undefined}
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                            className={`${signupInputClass} pl-11 pr-12`}
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
                        {!isSignup && loginIntegrations.gmailEnabled && (
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
                          className={`${signupInputClass} pl-11`}
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
                          className={`${signupInputClass} text-center tracking-[0.3em]`}
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
                          className={signupInputClass}
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
                          className={signupInputClass}
                          required
                        />
                      </>
                    )}
                    {isSignup && step === 2 && (
                      <dl className="flex min-h-53 flex-col justify-center space-y-2 rounded-xl bg-[#FAF6F0] p-4 text-sm">
                        {[
                          ["Branch name", branchName],
                          ["Branch address", branchAddress],
                          ["Branch phone", branchPhone],
                          ["Manager name", managerName],
                          ["Login email", managerEmail],
                          ["Password", "•".repeat(password.length)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex justify-between gap-4"
                          >
                            <dt className="text-gray-500">{label}</dt>
                            <dd className="wrap-break-word text-right font-medium text-[#0A3B3D]">
                              {value || "-"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              {isSignup && <FlowStepper step={step} steps={signupSteps} />}
              {isForgotPassword && (
                <FlowStepper step={resetStep} steps={passwordResetSteps} />
              )}
              {!isSignup && !isForgotPassword && loginIntegrations.recaptchaEnabled && (
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
                {((isSignup && step > 0) ||
                  (isForgotPassword && resetStep > 0)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(-1);
                      if (isSignup) {
                        setStep((currentStep) => currentStep - 1);
                      } else {
                        setResetStep((currentStep) => currentStep - 1);
                      }
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
                    (!isSignup &&
                      !isForgotPassword &&
                      loginIntegrations.recaptchaEnabled &&
                      (!loginIntegrations.recaptchaSiteKey || !recaptchaToken))
                  }
                  className="flex-1 bg-[#0A8B8E] text-white font-medium py-3 rounded-xl shadow-sm hover:bg-[#097578] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Please wait..."
                    : isSignup
                      ? step < signupSteps.length - 1
                        ? "Next"
                        : "Submit branch application"
                      : isForgotPassword
                        ? ["Send code", "Verify code", "Reset password"][
                            resetStep
                          ]
                        : "Login"}
                </button>
              </div>
            </form>

            {!isSignup && !isForgotPassword && loginIntegrations.staffGoogleAuthEnabled && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    Or continue with
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <button
                  type="button"
                  onClick={triggerGoogleLogin}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-400 text-sm font-medium text-black hover:bg-neutral-50"
                >
                  <GoogleIcon /> Google
                </button>
                <div
                  ref={hiddenGoogleBtn}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                    height: 0,
                    overflow: "hidden",
                  }}
                >
                  <GoogleLogin
                    locale="en"
                    text="continue_with"
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                  />
                </div>
              </>
            )}
            <p className="text-center text-sm text-gray-500 mt-5">
              {isSignup
                ? "Already have an account?"
                : isForgotPassword
                  ? "Remembered your password?"
                  : "Managing a branch?"}{" "}
              <button
                type="button"
                onClick={() => {
                  if (isForgotPassword) {
                    setIsForgotPassword(false);
                    setResetStep(0);
                    setResetCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setIdentifier(forgotEmail);
                  } else {
                    setIsSignup((value) => !value);
                  }
                  setPassword("");
                  setRecaptchaToken("");
                  recaptchaRef.current?.reset();
                  setStep(0);
                  setDirection(1);
                }}
                className="font-semibold text-[#0A8B8E] hover:underline"
              >
                {isSignup || isForgotPassword ? "Back to login" : "Apply here"}
              </button>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default Login;
