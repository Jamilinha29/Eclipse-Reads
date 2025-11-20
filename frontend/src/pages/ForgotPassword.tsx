import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar e-mail: " + error.message);
      return;
    }

    setEmailSent(true);
    toast.success("E-mail de recuperação enviado!");
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
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para login
          </Button>

          {!emailSent ? (
            <>
              <h2 className="text-2xl font-bold mb-2">Recuperar senha</h2>
              <p className="text-muted-foreground mb-6">
                Digite seu e-mail e enviaremos instruções para redefinir sua senha.
              </p>

              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  className="w-full h-11 font-semibold"
                  size="lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">E-mail enviado!</h2>
              <p className="text-muted-foreground">
                Enviamos as instruções de recuperação para <strong>{email}</strong>.
                Verifique sua caixa de entrada e spam.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Voltar para login
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
