import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  LogOut,
  Menu,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler.jsx";

export default function TopBar({
  breadcrumb,
  userName,
  accountName,
  userEmail,
  userRole,
  userPicture,
  isSettingsPage,
  mobileSidebarOpen,
  mobileMode,
  desktopSidebarCollapsed,
  onToggleSidebar,
  onToggleDesktopSidebar,
  theme,
  onThemeChange,
  soundEnabled,
  onToggleSound,
  onLogout,
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);
  const menuName = accountName || userName;
  const initial = (accountName || userName || "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setAccountMenuOpen(false);
      accountButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <header className="relative z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E9E2D6] bg-[#FFFCF7] px-3 sm:px-5 lg:px-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {mobileMode && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileSidebarOpen}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E9E2D6] text-muted hover:bg-[#F5EFE4] hover:text-[#0A7779] dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-[#45C5C1]"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
          {!mobileMode && <button
            type="button"
            onClick={onToggleDesktopSidebar}
            aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!desktopSidebarCollapsed}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E9E2D6] text-muted transition-colors hover:bg-[#F5EFE4] hover:text-[#0A7779] dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-[#45C5C1]"
          >
            <ChevronLeft
              size={18}
              aria-hidden="true"
              className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${desktopSidebarCollapsed ? "rotate-180" : ""}`}
            />
          </button>}
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-muted sm:text-xs">
              {breadcrumb}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <AnimatedThemeToggler
            theme={theme}
            onThemeChange={onThemeChange}
            variant="circle"
            aria-label="Choose theme"
          />
          <button
            type="button"
            onClick={onToggleSound}
            data-sound-effect="toggle"
            aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Turn sound off" : "Turn sound on"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#F5EFE4] hover:text-[#0A7779] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-[#45C5C1]"
          >
            {soundEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
          </button>
          <div className="h-8 w-px bg-[#E9E2D6] dark:bg-neutral-700" aria-hidden="true" />

          <div ref={accountMenuRef} className="relative">
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label={`Account menu for ${menuName || "user"}`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              title={userEmail}
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-[#F5EFE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-neutral-800 sm:gap-3 sm:px-2"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-[#FFFCF7] dark:ring-offset-neutral-900 ${
                  accountMenuOpen
                    ? "ring-neutral-400 dark:ring-neutral-500"
                    : isSettingsPage
                      ? "ring-[#0A8B8E]"
                      : "ring-transparent"
                }`}
              >
                {userPicture ? (
                  <img
                    src={userPicture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-medium text-white dark:bg-[#0A8B8E]">
                    {initial}
                  </span>
                )}
              </span>
              <span className="hidden min-w-0 max-w-24 text-left sm:block sm:max-w-32">
                <span className="block truncate text-xs font-medium leading-tight text-primary-strong sm:text-sm dark:text-white">
                  {userName}
                </span>
                {userRole && (
                  <span className="mt-0.5 hidden truncate text-xs text-muted md:block">
                    {userRole}
                  </span>
                )}
              </span>
            </button>

            <AnimatePresence>
              {accountMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ transformOrigin: "top right" }}
                  role="menu"
                  aria-label="Account menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E9E2D6] bg-[#FFFCF7] p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-primary-strong dark:text-white">
                      {menuName}
                    </p>
                    {userRole && (
                      <p className="mt-1 truncate text-xs text-muted dark:text-gray-400">
                        {userRole}
                      </p>
                    )}
                    {userEmail && (
                      <p className="mt-1 truncate text-xs text-muted dark:text-gray-400">
                        {userEmail}
                      </p>
                    )}
                  </div>
                  <div className="my-1 border-t border-[#E9E2D6] dark:border-neutral-700" />
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-primary-strong transition-colors hover:bg-[#F5EFE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-gray-200 dark:hover:bg-neutral-800"
                  >
                    <Settings size={16} aria-hidden="true" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onLogout();
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </MotionConfig>
  );
}
