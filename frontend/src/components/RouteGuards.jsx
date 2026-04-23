import { Navigate, useLocation } from "react-router-dom";

import LoadingScreen from "./ui/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return <LoadingScreen label="Loading TechvSOC XDR Platform" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, booting } = useAuth();

  if (booting) {
    return <LoadingScreen label="Preparing workspace" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
