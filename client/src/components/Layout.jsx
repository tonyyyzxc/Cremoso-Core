import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import SidebarNav from "./Sidebar";
import TopBar from "./Topbar";

const titleMap = {
  dashboard: "Dashboard",
  orders: "Orders",
  menu: "Menu",
  inventory: "Inventory",
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
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    document.title = `${titleMap[activeId] || "Dashboard"} | Cremoso`;
  }, [activeId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleSelect = (id) => navigate(`/${id}`);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="flex h-screen">
      {sidebarOpen && (
        <SidebarNav
          activeId={activeId}
          onSelect={handleSelect}
          onLogout={handleLogout}
        />
      )}
      <div className="flex-1 flex flex-col">
        <TopBar
          pageTitle={titleMap[activeId] || "Dashboard"}
          userName={user?.name || user?.email || ""}
          userEmail={user?.email || ""}
          userRole={[user?.role, user?.office].filter(Boolean).join(" · ")}
          userRoleOnly={user?.role || ""}
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
