import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LandingPage from "./pages/Landingpage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AnalisisPage from "./pages/AnalisisPage";
import WilayahPage from "./pages/WilayahPage";
import AIPage from "./pages/AIPage";
import TimelinePage from "./pages/TimelinePage";
import AdminPage from "./pages/AdminPage";
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,PieChart,Pie,Cell,} from "recharts";

function ProtectedLayout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <HomePage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/analisis"
            element={
              <ProtectedLayout>
                <AnalisisPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/wilayah"
            element={
              <ProtectedLayout>
                <WilayahPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/ai"
            element={
              <ProtectedLayout>
                <AIPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/timeline"
            element={
              <ProtectedLayout>
                <TimelinePage />
              </ProtectedLayout>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedLayout adminOnly>
                <AdminPage />
              </ProtectedLayout>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}