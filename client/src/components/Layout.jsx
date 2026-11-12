import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import SidebarNav from "./Sidebar";
import TopBar from "./Topbar";
import { apiRequest } from "../utils/api.js";
import {
  getPushRegistrationStatus,
  initializePushMessaging,
} from "../firebase.js";
import { StreakBar } from "./loading.jsx";

const titleMap = {
  dashboard: "Dashboard",
  staff: "Staff",
  "new-order": "New Order",
  "order-queue": "Order Queue",
  transactions: "Transactions",
  reports: "Reports",
  schedule: "Shift Schedule",
  reconciliation: "Shift Reconciliation",
  orders: "Orders",
  menu: "Menu",
  management: "Management",
  settings: "Settings",
  drive: "YourDrive",
  "activity-logs": "Activity Logs",
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.replace("/", "") || "dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState("desktop");
  const [showSidebarIcons, setShowSidebarIcons] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const contentRef = useRef(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1279px)");
    const updateViewportMode = () => {
      setViewportMode(mobileQuery.matches ? "mobile" : tabletQuery.matches ? "tablet" : "desktop");
    };

    updateViewportMode();
    mobileQuery.addEventListener("change", updateViewportMode);
    tabletQuery.addEventListener("change", updateViewportMode);

    return () => {
      mobileQuery.removeEventListener("change", updateViewportMode);
      tabletQuery.removeEventListener("change", updateViewportMode);
    };
  }, []);

  const [user] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [branchName, setBranchName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiRequest("/api/auth-settings")
      .then((config) => setShowSidebarIcons(config.showSidebarIcons !== false))
      .catch((error) => {
        console.error("Sidebar settings load error:", error);
      });
  }, [user]);

  useEffect(() => {
    if (!["branch", "staff"].includes(user?.role)) return;
    getPushRegistrationStatus()
      .then(({ registered }) => registered ? initializePushMessaging() : false)
      .catch((error) => console.error("Push registration load error:", error));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "branch") return;
    apiRequest("/api/staff/branch")
      .then((data) => setBranchName(data.branch?.name || ""))
      .catch(() => {
        // Keep showing the person's name if the branch cannot be loaded.
      });
  }, [user?.role]);

  useEffect(() => {
    document.title = `${titleMap[activeId] || "Dashboard"} | Cremoso`;
  }, [activeId]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (viewportMode !== "mobile" || !mobileSidebarOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen, viewportMode]);

  const handleSelect = (id) => {
    navigate(`/${id}`);
    setMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {viewportMode === "mobile" && mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}
      <SidebarNav
        activeId={activeId}
        onSelect={handleSelect}
        onLogout={handleLogout}
        userRole={user?.role}
        collapsed={viewportMode === "tablet" || (viewportMode === "desktop" && !sidebarOpen)}
        mobileOpen={viewportMode !== "mobile" || mobileSidebarOpen}
        showIcons={viewportMode === "tablet" || showSidebarIcons}
      />
      <div className="flex min-w-0 flex-1 flex-col transition-[width] duration-300 ease-in-out motion-reduce:transition-none">
        <TopBar
          pageTitle={titleMap[activeId] || "Dashboard"}
          userName={branchName || user?.name || user?.email || ""}
          userEmail={user?.email || ""}
          userRole={[
            user?.isSuperAdmin
              ? "SUPER ADMIN"
              : user?.role === "branch"
                ? "BRANCH"
                : user?.role?.toUpperCase(),
            user?.office,
          ]
            .filter(Boolean)
            .join(" / ")}
          userPicture={user?.picture}
          onViewProfile={() => navigate("/settings")}
          sidebarOpen={sidebarOpen}
          mobileSidebarOpen={mobileSidebarOpen}
          mobileMode={viewportMode === "mobile"}
          onToggleSidebar={() => {
            if (viewportMode === "mobile") {
              setMobileSidebarOpen((open) => !open);
            } else if (viewportMode === "desktop") {
              setSidebarOpen((open) => !open);
            }
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
        />
        <div ref={contentRef} className="min-w-0 flex-1 overflow-y-auto scroll-smooth bg-black/2 p-4 sm:p-5 lg:p-6 dark:bg-black">
          <Outlet context={{ showSidebarIcons, setShowSidebarIcons }} />
        </div>
      </div>
      <AnimatePresence>{loggingOut && <StreakBar />}</AnimatePresence>
    </div>
  );
}
