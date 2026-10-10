import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./src/pages/Login.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<p>Dashboard page is not implemented yet.</p>} />
      <Route path="*" element={<p>404 - Page not found</p>} />
    </Routes>
  );
}

export default App;
