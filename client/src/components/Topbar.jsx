import { Menu, Moon, Sun } from "lucide-react";

export default function TopBar({
  pageTitle,
  userName,
  userEmail,
  userRole,
  userPicture,
  onViewProfile,
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
}) {
  const initial = (userName || "?").charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Left: sidebar toggle + page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="rounded-lg p-2 text-gray-500 transition hover:bg-[#FBF6EF] hover:text-[#0A8B8E] dark:hover:bg-neutral-800"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-[#0A3B3D] dark:text-white">
          {pageTitle}
        </h1>
      </div>

      {/* Right: theme toggle + user */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-[#FBF6EF] hover:text-[#0A8B8E] dark:hover:bg-neutral-800"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          type="button"
          onClick={onViewProfile}
          title={userEmail}
          className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#FBF6EF] dark:hover:bg-neutral-800"
        >
          {userPicture ? (
            <img
              src={userPicture}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-[#F2C879]"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A8B8E] text-sm font-medium text-white ring-2 ring-[#F2C879]">
              {initial}
            </div>
          )}
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-[#0A3B3D] dark:text-white">
              {userName}
            </p>
            {userRole && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userRole}
              </p>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
