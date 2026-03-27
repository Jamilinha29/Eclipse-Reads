import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash) {
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const errorCode = hashParams.get("error_code");
      if (errorCode === "otp_expired") {
        setLinkError("Link expirado. Solicite um novo e-mail de recuperação.");
      }
    }

    const searchParams = new URLSearchParams(window.location.search);
    const searchErrorCode = searchParams.get("error_code");
    if (searchErrorCode === "otp_expired") {
      setLinkError("Link expirado. Solicite um novo e-mail de recuperação.");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) {
      toast.error("Preencha os campos");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Erro ao definir senha: " + error.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Senha alterada! Faça login com a nova senha.");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Eclipse Reads" className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold">
            Eclipse <span className="text-accent">Reads</span>
          </h1>
        </div>

        <Card className="p-8 border-border">
          <Button variant="ghost" size="sm" className="mb-4" type="button" onClick={() => navigate("/auth")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para login
          </Button>

          {linkError ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-destructive">{linkError}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/forgot-password")}>
                Solicitar novo e-mail
              </Button>
            </div>
          ) : !sessionReady ? (
            <p className="text-muted-foreground text-center py-8">Validando link de recuperação...</p>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Nova senha</h2>
              <p className="text-muted-foreground mb-6">Defina uma nova senha para sua conta.</p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button className="w-full h-11 font-semibold" size="lg" type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
