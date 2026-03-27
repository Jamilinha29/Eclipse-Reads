import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Trata links de autenticação do Supabase que chegam com hash na URL.
 * Evita "tela vazia" quando o link está expirado/inválido e
 * encaminha recuperação de senha para a rota pública correta.
 */
const AuthLinkHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || "";
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = hashParams.get("type");
    const errorCode = hashParams.get("error_code");
    const error = hashParams.get("error");

    if (type === "recovery" && location.pathname !== "/reset-password") {
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }

    const isExpiredRecovery =
      (error === "access_denied" && errorCode === "otp_expired") ||
      errorCode === "otp_expired";
    if (isExpiredRecovery) {
      toast.error("Link de recuperação expirado. Solicite um novo e-mail.");
      navigate("/forgot-password", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

export default AuthLinkHandler;
