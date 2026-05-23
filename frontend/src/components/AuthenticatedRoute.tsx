import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

/** Exige conta real (e-mail/Google) — convidados não passam (D-03). */
const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
  const { authType, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-label="Carregando" />
      </div>
    );
  }

  if (authType === "guest" || !session?.access_token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default AuthenticatedRoute;
