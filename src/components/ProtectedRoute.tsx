import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, roleHomePath } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allow: AppRole[];
}

export default function ProtectedRoute({ children, allow }: Props) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) return <Navigate to={roleHomePath[role]} replace />;

  return <>{children}</>;
}
