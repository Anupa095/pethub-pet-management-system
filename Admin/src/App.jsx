import { Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PetAccountsPage from "./pages/PetAccountsPage";
import UserAccountsPage from "./pages/UserAccountsPage";
import VaccinationCheckingPage from "./pages/VaccinationCheckingPage";

function isLoggedIn() {
  return localStorage.getItem("pethub_admin_logged_in") === "true";
}

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>

      {/* 🔥 Root always starts at login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 🔐 Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* 🧭 Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserAccountsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pets"
        element={
          <ProtectedRoute>
            <PetAccountsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vaccination"
        element={
          <ProtectedRoute>
            <VaccinationCheckingPage />
          </ProtectedRoute>
        }
      />

      {/* 🔁 redirect /home → dashboard */}
      <Route path="/home" element={<Navigate to="/dashboard" replace />} />

      {/* ❌ fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}