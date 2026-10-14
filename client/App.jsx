import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./src/pages/Login.jsx";
import Layout from "./src/components/Layout.jsx";
import Dashboard from "./src/pages/Dashboard.jsx";
import MenuPage from "./src/pages/Menu.jsx";
import SettingsPage from "./src/pages/Settings.jsx";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  return getStoredUser()?.role === "admin"
    ? children
    : <Navigate to="/dashboard" replace />;
}

function LoginRoute() {
  if (localStorage.getItem("token")) {
    return <Navigate to={getStoredUser()?.role === "admin" ? "/menu" : "/dashboard"} replace />;
  }
  return <Login />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/orders"
          element={<p>Orders page is not implemented yet.</p>}
        />
        <Route path="/menu" element={<MenuPage />} />
        <Route
          path="/inventory"
          element={<p>Inventory page is not implemented yet.</p>}
        />
        <Route path="/settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<p>404 - Page not found</p>} />
    </Routes>
  );
}

export default App;
