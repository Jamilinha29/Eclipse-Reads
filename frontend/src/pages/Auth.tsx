import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuthType, setUserId, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Verifica se o usuário é admin
  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    return !!data;
  };

  // Redireciona se já estiver logado
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleGuestLogin = () => {
    setAuthType("guest");
    setUserId(null);
    navigate("/", { replace: true });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("E-mail ou senha incorretos");
      } else {
        toast.error("Erro ao fazer login: " + error.message);
      }
      return;
    }

    if (data.user) {
      toast.success("Login realizado com sucesso!");
      navigate("/", { replace: true });
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Este e-mail já está cadastrado");
      } else {
        toast.error("Erro ao criar conta: " + error.message);
      }
      return;
    }

    toast.success("Conta criada! Você já pode fazer login.");
    navigate("/", { replace: true });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth-callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao fazer login com Google: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="Eclipse Reads" className="h-16 w-16" />
            <h1 className="text-4xl font-bold">
              Eclipse <span className="text-accent">Reads</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Onde novas histórias nascem, grandes leitores se conectam e todos os gêneros têm voz.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>Milhares de livros</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>Leitura offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>Sincronização</span>
            </div>
          </div>
        </div>

        <Card className="p-8 border-border">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleEmailLogin}>
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
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••" 
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm cursor-pointer select-none"
                    >
                      Lembrar-me
                    </label>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-primary p-0"
                    onClick={() => navigate("/forgot-password")}
                    type="button"
                  >
                    Esqueci a senha
                  </Button>
                </div>
                <Button className="w-full h-11 font-semibold" size="lg" type="submit" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">OU</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full h-11" type="button" onClick={handleGoogleLogin} disabled={loading}>
                  {loading ? "Carregando..." : "Continuar com Google"}
                </Button>
                <Button variant="outline" className="w-full h-11" type="button" onClick={handleGuestLogin} disabled={loading}>
                  Entrar como Convidado
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleEmailSignup}>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Seu nome completo" 
                    className="h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm cursor-pointer select-none leading-relaxed">
                    Eu aceito os{" "}
                    <span className="text-primary underline">termos de uso</span> e{" "}
                    <span className="text-primary underline">política de privacidade</span>
                  </label>
                </div>
                <Button className="w-full h-11 font-semibold" size="lg" type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Criar Conta"}
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">OU</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full h-11" type="button" onClick={handleGoogleLogin} disabled={loading}>
                  {loading ? "Carregando..." : "Continuar com Google"}
                </Button>
                <Button variant="outline" className="w-full h-11" type="button" onClick={handleGuestLogin} disabled={loading}>
                  Entrar como Convidado
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
