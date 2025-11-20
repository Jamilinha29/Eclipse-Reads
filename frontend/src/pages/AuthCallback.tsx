import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          toast.error("Erro ao fazer login");
          navigate("/auth", { replace: true });
          return;
        }

        if (user) {
          toast.success("Login realizado com sucesso!");
          navigate("/", { replace: true });
        } else {
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        console.error("Error in callback:", error);
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Finalizando login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
