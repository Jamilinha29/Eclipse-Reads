import { ArrowLeft, Palette, Sun, Moon, Volume2, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_VALIDATION_MESSAGE,
} from "@/lib/usernameValidation";

const Settings = () => {
  const { username, setUsername, userId, token, theme: globalTheme, setTheme: setGlobalTheme } = useAuth();
  const [localUsername, setLocalUsername] = useState(username);
  const [theme, setTheme] = useState<"light" | "dark">(globalTheme);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newBooksNotifications, setNewBooksNotifications] = useState(true);
  const settingsHydratedRef = useRef(false);

  useEffect(() => {
    setLocalUsername(username);
  }, [username]);

  useEffect(() => {
    settingsHydratedRef.current = false;

    const loadSettings = async () => {
      if (!userId || !token) {
        settingsHydratedRef.current = true;
        return;
      }

      try {
        const { settings } = await api.getMeSettings(token);

        if (settings) {
          const t = settings.theme as "light" | "dark";
          setTheme(t);
          setGlobalTheme(t);
          setSoundEnabled(!!settings.sound_enabled);
          setNewBooksNotifications(!!settings.new_books_notifications);
        }
      } catch {
        toast.error("Não foi possível carregar suas configurações.");
      } finally {
        settingsHydratedRef.current = true;
      }
    };

    loadSettings();
  }, [userId, token, setGlobalTheme]);

  const saveSettings = useCallback(async () => {
    if (!userId || !token) return;
    try {
      const response = await api.updateMeSettings(
        {
          theme,
          sound_enabled: soundEnabled,
          new_books_notifications: newBooksNotifications,
        },
        token
      );
      if (response.error) {
        toast.error(response.error);
      }
    } catch {
      toast.error("Não foi possível conectar ao servidor de configurações.");
    }
  }, [userId, token, theme, soundEnabled, newBooksNotifications]);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;
    setGlobalTheme(theme);
    if (userId) {
      saveSettings();
    }
  }, [theme, soundEnabled, newBooksNotifications, userId, token, setGlobalTheme, saveSettings]);

  const handleSaveUsername = async () => {
    const name = normalizeUsername(localUsername);
    if (!name) {
      toast.error("Digite um nome válido");
      return;
    }
    if (!isValidUsername(name)) {
      toast.error(`Nome de usuário inválido. ${USERNAME_VALIDATION_MESSAGE}`);
      return;
    }
    if (!userId || !token) {
      toast.error("Faça login com e-mail ou Google para salvar o nome");
      return;
    }

    setUsername(name);
    toast.success("Nome de usuário atualizado!");
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    toast.success(`Tema ${newTheme === "light" ? "Claro" : "Noturno"} ativado!`);
  };

  return (
    <div className="min-h-screen pb-8 bg-background">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <Link to="/profile">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">Configurações & Temas</h1>

        <Card className="p-6 mb-6 bg-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/20 p-2">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Tema da Interface</h2>
          </div>

          <div className="space-y-4">
            <div
              className="flex items-center justify-between p-4 rounded-lg bg-secondary cursor-pointer transition-smooth hover:bg-secondary/80"
              onClick={() => handleThemeChange("light")}
            >
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Claro (Cinza Escuro)</p>
                  <p className="text-sm text-muted-foreground">Tema claro com tons de cinza escuro</p>
                </div>
              </div>
              {theme === "light" && (
                <div className="rounded-full bg-primary h-2 w-2" />
              )}
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-lg bg-secondary cursor-pointer transition-smooth hover:bg-secondary/80"
              onClick={() => handleThemeChange("dark")}
            >
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Noturno</p>
                  <p className="text-sm text-muted-foreground">Tema noturno com cores roxas</p>
                </div>
              </div>
              {theme === "dark" && (
                <div className="rounded-full bg-primary h-2 w-2" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/20 p-2">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Preferências de Leitura</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Sons de Interface</p>
                <p className="text-sm text-muted-foreground">Reproduzir sons ao tocar em botões</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Novos Livros</p>
                <p className="text-sm text-muted-foreground">Receber avisos de novos livros adicionados</p>
              </div>
              <Switch checked={newBooksNotifications} onCheckedChange={setNewBooksNotifications} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/20 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Nome de Usuário</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-sm text-muted-foreground mb-2 block">
                Alterar nome de usuário
              </Label>
              <Input
                id="username"
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
                placeholder="Usuário"
                className="bg-secondary border-border"
              />
            </div>
            <Button onClick={handleSaveUsername} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Settings;
