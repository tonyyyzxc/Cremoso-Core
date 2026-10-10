import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./src/pages/Login.jsx";
import Layout from "./src/components/Layout.jsx";
import Dashboard from "./src/pages/Dashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/orders"
          element={<p>Orders page is not implemented yet.</p>}
        />
        <Route
          path="/menu"
          element={<p>Menu page is not implemented yet.</p>}
        />
        <Route
          path="/inventory"
          element={<p>Inventory page is not implemented yet.</p>}
        />
        <Route
          path="/settings"
          element={<p>Settings page is not implemented yet.</p>}
        />
      </Route>
      <Route path="*" element={<p>404 - Page not found</p>} />
    </Routes>
  );
}

export default App;
