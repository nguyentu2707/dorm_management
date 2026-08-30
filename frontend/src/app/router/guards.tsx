import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingState } from "../../components/ui/States";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/api";
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isInitializing, isAuthenticated } = useAuth();
  if (isInitializing) return <LoadingState />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
export function RoleRoute({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user } = useAuth();
  return user?.role === role ? (
    children
  ) : (
    <Navigate to="/unauthorized" replace />
  );
}
export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return <LoadingState />;
  if (!user) return children;
  return (
    <Navigate
      to={
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "STUDENT"
            ? "/student"
            : "/unauthorized"
      }
      replace
    />
  );
}
