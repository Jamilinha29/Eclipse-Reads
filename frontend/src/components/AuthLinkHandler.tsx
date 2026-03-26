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
    // #region agent log
    fetch('http://127.0.0.1:7496/ingest/d9af6dbb-bd7d-4391-aac0-8299a406f549',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc9329'},body:JSON.stringify({sessionId:'fc9329',runId:'recovery-debug-1',hypothesisId:'H1',location:'AuthLinkHandler.tsx:useEffect:start',message:'AuthLinkHandler effect started',data:{pathname:location.pathname,hasHash:!!hash},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = hashParams.get("type");
    const errorCode = hashParams.get("error_code");
    const error = hashParams.get("error");
    // #region agent log
    fetch('http://127.0.0.1:7496/ingest/d9af6dbb-bd7d-4391-aac0-8299a406f549',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc9329'},body:JSON.stringify({sessionId:'fc9329',runId:'recovery-debug-1',hypothesisId:'H2',location:'AuthLinkHandler.tsx:useEffect:parsedHash',message:'Parsed hash params for auth link',data:{pathname:location.pathname,type,errorCode,error},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (type === "recovery" && location.pathname !== "/reset-password") {
      // #region agent log
      fetch('http://127.0.0.1:7496/ingest/d9af6dbb-bd7d-4391-aac0-8299a406f549',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc9329'},body:JSON.stringify({sessionId:'fc9329',runId:'recovery-debug-1',hypothesisId:'H2',location:'AuthLinkHandler.tsx:useEffect:redirectRecovery',message:'Redirecting recovery link to reset-password',data:{fromPath:location.pathname,toPath:'/reset-password'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }

    const isExpiredRecovery =
      (error === "access_denied" && errorCode === "otp_expired") ||
      errorCode === "otp_expired";
    if (isExpiredRecovery) {
      // #region agent log
      fetch('http://127.0.0.1:7496/ingest/d9af6dbb-bd7d-4391-aac0-8299a406f549',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc9329'},body:JSON.stringify({sessionId:'fc9329',runId:'recovery-debug-1',hypothesisId:'H3',location:'AuthLinkHandler.tsx:useEffect:expiredRecovery',message:'Detected expired recovery link',data:{pathname:location.pathname,errorCode,error},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast.error("Link de recuperação expirado. Solicite um novo e-mail.");
      navigate("/forgot-password", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

export default AuthLinkHandler;
