import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./src/pages/Login.jsx";
import Layout from "./src/components/Layout.jsx";
import Dashboard from "./src/pages/Dashboard.jsx";
import MenuPage from "./src/pages/Menu.jsx";
import SettingsPage from "./src/pages/Settings.jsx";
import ManagementPage from "./src/pages/Management.jsx";
import StaffPage from "./src/pages/Staff.jsx";
import OrdersPage from "./src/pages/Orders.jsx";
import NewOrderPage from "./src/pages/NewOrder.jsx";
import OrderQueuePage from "./src/pages/OrderQueue.jsx";
import TransactionsPage from "./src/pages/Transactions.jsx";
import ReconciliationPage from "./src/pages/Reconciliation.jsx";
import ReportsPage from "./src/pages/Reports.jsx";
import DrivePage from "./src/pages/Drive.jsx";

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  return sessionStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  return getStoredUser()?.role === "admin"
    ? children
    : <Navigate to="/dashboard" replace />;
}

function RequireStaff({ children }) {
  return getStoredUser()?.role === "staff"
    ? children
    : <Navigate to="/dashboard" replace />;
}

function LoginRoute() {
  if (sessionStorage.getItem("token")) {
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
        <Route path="/orders" element={<RequireAdmin><OrdersPage /></RequireAdmin>} />
        <Route path="/new-order" element={<RequireStaff><NewOrderPage /></RequireStaff>} />
        <Route path="/order-queue" element={<RequireStaff><OrderQueuePage /></RequireStaff>} />
        <Route path="/transactions" element={<RequireStaff><TransactionsPage /></RequireStaff>} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reconciliation" element={<RequireStaff><ReconciliationPage /></RequireStaff>} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/management" element={<RequireAdmin><ManagementPage /></RequireAdmin>} />
        <Route path="/staff" element={<RequireStaff><StaffPage /></RequireStaff>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/drive" element={<DrivePage />} />
      </Route>
      <Route path="*" element={<p>404 - Page not found</p>} />
    </Routes>
  );
}

export default App;
