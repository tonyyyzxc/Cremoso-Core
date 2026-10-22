import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import SidebarNav from "./Sidebar";
import TopBar from "./Topbar";
import { apiRequest } from "../utils/api.js";

const titleMap = {
  dashboard: "Dashboard",
  staff: "Staff",
  "new-order": "New Order",
  "order-queue": "Order Queue",
  transactions: "Transactions",
  reports: "Reports",
  reconciliation: "Shift Reconciliation",
  orders: "Orders",
  menu: "Menu",
  management: "Management",
  settings: "Settings",
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.replace("/", "") || "dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const [user] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (user?.role !== "staff") return;
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
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleSelect = (id) => navigate(`/${id}`);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear this browser's credentials even if the API cannot be reached.
    }
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen">
      {sidebarOpen && (
        <SidebarNav
          activeId={activeId}
          onSelect={handleSelect}
          onLogout={handleLogout}
          userRole={user?.role}
        />
      )}
      <div className="flex-1 flex flex-col">
        <TopBar
          pageTitle={titleMap[activeId] || "Dashboard"}
          userName={branchName || user?.name || user?.email || ""}
          userEmail={user?.email || ""}
          userRole={[user?.role?.toUpperCase(), user?.office]
            .filter(Boolean)
            .join(" / ")}
          userPicture={user?.picture}
          onViewProfile={() => navigate("/settings")}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
        />
        <div className="flex-1 overflow-y-auto bg-black/2 dark:bg-black p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
