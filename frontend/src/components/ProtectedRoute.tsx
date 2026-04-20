import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import client from "../api/client";

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: ("admin" | "agent")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { accessToken, user, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const validateToken = async () => {
      if (!accessToken) {
        setIsValidating(false);
        return;
      }
      try {
        await client.get("/api/v1/dashboard");
      } catch (err: any) {
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [accessToken, logout]);

  if (isValidating) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>;
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
