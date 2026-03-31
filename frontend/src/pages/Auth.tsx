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
import {
  supabase,
  AUTH_REMEMBER_ME_KEY,
  AUTH_SAVED_EMAIL_KEY,
  AUTH_SAVED_PASSWORD_KEY,
} from "@/integrations/supabase/client";
import { GUEST_AUTH_FLAG_KEY } from "@/integrations/supabase/profileMediaStorage";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_VALIDATION_MESSAGE,
} from "@/lib/usernameValidation";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      d="M21.35 11.1H12v2.98h5.37c-.24 1.52-1.85 4.47-5.37 4.47-3.23 0-5.87-2.68-5.87-5.98S8.77 6.6 12 6.6c1.84 0 3.08.79 3.79 1.47l2.58-2.5C16.73 4.07 14.56 3 12 3 6.93 3 2.82 7.13 2.82 12.2S6.93 21.4 12 21.4c6.93 0 9.18-4.87 9.18-7.39 0-.5-.05-.86-.12-1.2l.29-1.71z"
      fill="currentColor"
    />
  </svg>
);

const Auth = () => {
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(AUTH_REMEMBER_ME_KEY) === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  const { setAuthType, setUserId, isLoggedIn, authType } = useAuth();
  const navigate = useNavigate();
  const authClient = supabase.auth as any;

  // Link antigo de recuperação que apontava para /auth: envia para a página correta (mantém o hash).
  useEffect(() => {
    const h = window.location.hash || "";
    if (h.includes("type=recovery")) {
      navigate(`/reset-password${h}`, { replace: true });
    }
  }, [navigate]);

  // Redireciona se já estiver logado (inclui após login/cadastro, quando o Supabase atualiza o contexto).
  // Porém, se for convidado (guest), NÃO redireciona, para que ele consiga fazer o login real.
  useEffect(() => {
    if (isLoggedIn && authType !== "guest") {
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, authType, navigate]);

  const handleGuestLogin = () => {
    localStorage.removeItem(AUTH_REMEMBER_ME_KEY);
    try {
      localStorage.removeItem(AUTH_SAVED_EMAIL_KEY);
      localStorage.removeItem(AUTH_SAVED_PASSWORD_KEY);
    } catch {
      /* ignore */
    }
    localStorage.setItem(GUEST_AUTH_FLAG_KEY, "guest");
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

    localStorage.setItem(AUTH_REMEMBER_ME_KEY, String(rememberMe));
    setLoading(true);
    const { data, error } = authClient.signInWithPassword
      ? await authClient.signInWithPassword({ email, password })
      : await authClient.signIn({ email, password });

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
      try {
        if (rememberMe) {
          localStorage.setItem(AUTH_SAVED_EMAIL_KEY, email);
          localStorage.setItem(AUTH_SAVED_PASSWORD_KEY, password);
        } else {
          localStorage.removeItem(AUTH_SAVED_EMAIL_KEY);
          localStorage.removeItem(AUTH_SAVED_PASSWORD_KEY);
        }
      } catch {
        /* ignore */
      }
      toast.success("Login realizado com sucesso!");
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

    const normalizedName = normalizeUsername(name);
    if (!isValidUsername(normalizedName)) {
      toast.error(`Nome de usuário inválido. ${USERNAME_VALIDATION_MESSAGE}`);
      return;
    }

    setLoading(true);
    // Rota pública: evita perder o hash de confirmação ao passar por rotas protegidas.
    const redirectUrl = `${window.location.origin}/auth`;

    const { data: signData, error } = await authClient.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: normalizedName,
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

    if (signData?.user && !signData.session) {
      toast.success("Enviamos um e-mail de confirmação. Abra o link para ativar a conta.");
      return;
    }

    toast.success("Conta criada! Você já pode fazer login.");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth-callback`;
    const { error } = authClient.signInWithOAuth
      ? await authClient.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        })
      : await authClient.signIn({ provider: "google" }, { redirectTo });

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleEmailLogin} autoComplete="on">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input 
                    id="password"
                    name="password"
                    type="password" 
                    placeholder="••••••" 
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
                <Button variant="outline" className="w-full h-11 gap-2" type="button" onClick={handleGoogleLogin} disabled={loading}>
                  <GoogleIcon />
                  {loading ? "Carregando..." : "Continuar com Google"}
                </Button>
                <Button variant="outline" className="w-full h-11 gap-2" type="button" onClick={handleGuestLogin} disabled={loading}>
                  <UserRound className="h-4 w-4" />
                  Entrar como Convidado
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleEmailSignup} autoComplete="on">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="Seu nome completo" 
                    className="h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    name="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    name="signup-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    placeholder="••••••"
                    className="h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
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
                <Button variant="outline" className="w-full h-11 gap-2" type="button" onClick={handleGoogleLogin} disabled={loading}>
                  <GoogleIcon />
                  {loading ? "Carregando..." : "Continuar com Google"}
                </Button>
                <Button variant="outline" className="w-full h-11 gap-2" type="button" onClick={handleGuestLogin} disabled={loading}>
                  <UserRound className="h-4 w-4" />
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
