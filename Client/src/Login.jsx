import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Email:", email, "Password:", password);
  };

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-xl shadow-[#0A8B8E]/10 overflow-hidden grid md:grid-cols-2">
        {/* Left panel — brand / illustration side, mirrors the Cremoso logo layout */}
        <div className="relative bg-[#0A8B8E] flex flex-col items-center justify-center px-8 py-14 md:py-0 overflow-hidden">
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
        <div className="flex flex-col justify-center px-8 py-12 md:px-12">
          <h2 className="text-[#0A3B3D] text-2xl font-semibold mb-1">
            Welcome!
          </h2>
          <p className="text-gray-500 text-sm mb-7">
            Login to your Cremoso account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0] text-[#0A3B3D] placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 transition"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0] text-[#0A3B3D] placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 transition"
              required
            />

            <button
              type="submit"
              className="w-full bg-[#0A8B8E] text-white font-medium py-3 rounded-xl shadow-sm hover:bg-[#097578] active:scale-[0.99] transition"
            >
              Login
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">Or with</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            className="w-full bg-white text-[#0A3B3D] py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>
            Login with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Having trouble logging in? Contact{" "}
            <span className="text-[#0A8B8E] font-medium cursor-pointer hover:underline">
              Admin
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
