import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import NewSale from "./pages/NewSale";
import SalesHistory from "./pages/SalesHistory";
import ReceiptSettings from "./pages/ReceiptSettings";
import Users from "./pages/Users";

// Renders a full-screen loader while auth state is being resolved
function AuthGuard({ children }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="text-sm text-ink-400">Loading…</p>
      </div>
    );
  }
  return children;
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

// SettingsProvider is only mounted when the user is authenticated,
// so it never fires an API call on the login page.
function AuthenticatedShell() {
  return (
    <ProtectedRoute>
      <SettingsProvider>
        <AppLayout />
      </SettingsProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthenticatedShell />}>
          <Route path="/" element={<NewSale />} />
          <Route path="/receipts" element={<SalesHistory />} />
          <Route path="/settings" element={<ReceiptSettings />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGuard>
  );
}
