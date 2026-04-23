import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { useAuth } from "./context/AuthContext";
import AppShell from "./layouts/AppShell";
import { SkeletonBlock, SkeletonRows, SkeletonStats } from "./components/ui/Skeleton";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DetectionsPage = lazy(() => import("./pages/DetectionsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ScannerPage = lazy(() => import("./pages/ScannerPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function RouteLoader({ auth = false }) {
  if (auth) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] px-6 py-10 text-[var(--text-primary)]">
        <div className="mx-auto max-w-md rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-card)] p-8 shadow-glow backdrop-blur-2xl">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-6 h-10 w-3/4" />
          <div className="mt-4">
            <SkeletonRows rows={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-card)] p-7 shadow-glow backdrop-blur-2xl">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-5 h-10 w-2/3" />
        <div className="mt-4 max-w-2xl">
          <SkeletonRows rows={3} />
        </div>
      </div>
      <SkeletonStats count={4} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-80 w-full rounded-[2rem]" />
        <SkeletonBlock className="h-80 w-full rounded-[2rem]" />
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<RouteLoader auth />}>
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<RouteLoader auth />}>
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          </Suspense>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<RouteLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="logs"
          element={
            <Suspense fallback={<RouteLoader />}>
              <LogsPage />
            </Suspense>
          }
        />
        <Route
          path="detections"
          element={
            <Suspense fallback={<RouteLoader />}>
              <DetectionsPage />
            </Suspense>
          }
        />
        <Route
          path="monitoring"
          element={
            <Suspense fallback={<RouteLoader />}>
              <MonitoringPage />
            </Suspense>
          }
        />
        <Route
          path="scanner"
          element={
            <Suspense fallback={<RouteLoader />}>
              <ScannerPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
      </Route>
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Suspense fallback={<RouteLoader />}>
              <NotFoundPage />
            </Suspense>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
