import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import SidebarNav from "./Sidebar";
import TopBar from "./Topbar";
import { apiRequest } from "../utils/api.js";
import {
  disablePushNotifications,
  getPushBrowserId,
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
  const [showSidebarIcons, setShowSidebarIcons] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const contentRef = useRef(null);

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

  const handleSelect = (id) => navigate(`/${id}`);

  const handleLogout = async () => {
    setLoggingOut(true);
    let browserId = "";
    try {
      browserId = getPushBrowserId();
      await disablePushNotifications();
    } catch (error) {
      console.error("Push registration removal during logout failed:", error);
    }
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ browserId }),
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarNav
        activeId={activeId}
        onSelect={handleSelect}
        onLogout={handleLogout}
        userRole={user?.role}
        collapsed={!sidebarOpen}
        showIcons={showSidebarIcons}
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
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
        />
        <div ref={contentRef} className="min-w-0 flex-1 overflow-y-auto scroll-smooth bg-black/2 p-6 dark:bg-black">
          <Outlet context={{ showSidebarIcons, setShowSidebarIcons }} />
        </div>
      </div>
      <AnimatePresence>{loggingOut && <StreakBar />}</AnimatePresence>
    </div>
  );
}
