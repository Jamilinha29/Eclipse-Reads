import { Heart, Book, CheckCircle, Clock, Award, Target, Camera, Plus, Trash2, Download, Smartphone, Upload, FileText, Shield, Users, TrendingUp, BarChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef, useState, useEffect } from "react";
import { useLibrary } from "@/contexts/LibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReadingGoal {
  id: string;
  title: string;
  target_books: number;
  current_books: number;
  deadline: string | null;
  completed: boolean;
}

const Profile = () => {
  const { favorites, reading, read } = useLibrary();
  const { isLoggedIn, authType, avatarImage, setAvatarImage, bannerImage, setBannerImage, username, userId } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStatsData, setAdminStatsData] = useState({
    totalBooks: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    totalCategories: 0,
  });


  // Verifica se o usuário é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [userId]);

  // Carrega estatísticas do administrador
  useEffect(() => {
    const loadAdminStats = async () => {
      if (!isAdmin) return;

      const [booksResult, submissionsResult, categoriesResult] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase.from("book_submissions").select("status", { count: "exact" }),
        supabase.from("books").select("category"),
      ]);

      const pendingCount = submissionsResult.data?.filter((s) => s.status === "pending").length || 0;
      const approvedCount = submissionsResult.data?.filter((s) => s.status === "approved").length || 0;
      const uniqueCategories = new Set(categoriesResult.data?.map((b) => b.category) || []).size;

      setAdminStatsData({
        totalBooks: booksResult.count || 0,
        pendingSubmissions: pendingCount,
        approvedSubmissions: approvedCount,
        totalCategories: uniqueCategories,
      });
    };

    loadAdminStats();
  }, [isAdmin]);

  // Carrega metas do Supabase
  useEffect(() => {
    const loadGoals = async () => {
      if (!userId || isAdmin) return;

      const { data } = await supabase
        .from("reading_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        setGoals(data as ReadingGoal[]);
      }
    };

    loadGoals();
  }, [userId, isAdmin]);

  const userStats = [
    { icon: Heart, label: "Favoritos", value: favorites.length },
    { icon: Book, label: "Lendo", value: reading.length },
    { icon: CheckCircle, label: "Lidos", value: read.length },
    { icon: Clock, label: "Leitura", value: 0 },
    { icon: Award, label: "Metas", value: goals.length },
    { icon: Target, label: "Conquistas", value: 0 },
  ];

  const adminStats = [
    { icon: Book, label: "Total Livros", value: adminStatsData.totalBooks },
    { icon: CheckCircle, label: "Aprovados", value: adminStatsData.approvedSubmissions },
    { icon: Clock, label: "Pendentes", value: adminStatsData.pendingSubmissions },
    { icon: Award, label: "Categorias", value: adminStatsData.totalCategories },
  ];

  const stats = isAdmin ? adminStats : userStats;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      // Envia para o Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('books')
        .getPublicUrl(filePath);

      // Salva no banco de dados
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          avatar_image: publicUrl,
          username: username,
        });

      if (dbError) throw dbError;

      setAvatarImage(publicUrl);
      toast({
        title: "Avatar atualizado!",
        description: "Sua imagem foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro ao salvar avatar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      // Envia para o Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/banner.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('books')
        .getPublicUrl(filePath);

      // Salva no banco de dados
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          banner_image: publicUrl,
          username: username,
        });

      if (dbError) throw dbError;

      setBannerImage(publicUrl);
      toast({
        title: "Banner atualizado!",
        description: "Sua imagem foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast({
        title: "Erro ao salvar banner",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle || !newGoalTarget || !userId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("reading_goals")
      .insert({
        user_id: userId,
        title: newGoalTitle,
        target_books: parseInt(newGoalTarget),
        deadline: newGoalDeadline || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
      return;
    }

    setGoals([data as ReadingGoal, ...goals]);
    setNewGoalTitle("");
    setNewGoalTarget("");
    setNewGoalDeadline("");
    setShowNewGoal(false);
    toast({ title: "Meta criada com sucesso!" });
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from("reading_goals")
      .delete()
      .eq("id", goalId);

    if (error) {
      toast({ title: "Erro ao deletar meta", variant: "destructive" });
      return;
    }

    setGoals(goals.filter((g) => g.id !== goalId));
    toast({ title: "Meta deletada!" });
  };

  const handleUpdateGoalProgress = async (goalId: string, increment: boolean) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const newCurrent = increment
      ? Math.min(goal.current_books + 1, goal.target_books)
      : Math.max(goal.current_books - 1, 0);

    const { error } = await supabase
      .from("reading_goals")
      .update({
        current_books: newCurrent,
        completed: newCurrent >= goal.target_books,
      })
      .eq("id", goalId);

    if (error) {
      toast({ title: "Erro ao atualizar meta", variant: "destructive" });
      return;
    }

    setGoals(
      goals.map((g) =>
        g.id === goalId
          ? { ...g, current_books: newCurrent, completed: newCurrent >= goal.target_books }
          : g
      )
    );
  };

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <Card className="p-0 mb-6 overflow-hidden">
          <div className="relative h-32 bg-gradient-primary group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
            {bannerImage && (
              <img src={bannerImage} alt="Banner" className="w-full h-full object-cover object-center" />
            )}
            <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-8 w-8" />
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6 -mt-16">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <Avatar className="h-24 w-24 bg-primary border-4 border-background">
                  {avatarImage ? (
                    <AvatarImage src={avatarImage} className="object-cover object-center" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                      U
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="mt-12">
                <h1 className="text-2xl font-bold mb-1">{username}</h1>
                <p className="text-muted-foreground">@{username.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
            </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-4 text-center bg-secondary border-0">
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
          </div>
        </Card>

        {authType === "guest" && (
          <Card className="p-6 mb-6 bg-gradient-primary text-primary-foreground">
            <div className="flex flex-col items-center gap-3 text-center">
              <Award className="h-8 w-8" />
              <h3 className="text-xl font-bold">Libere todos os livros!</h3>
              <p className="text-sm opacity-90">Faça login e tenha acesso ilimitado a variados recursos</p>
              <Button variant="secondary" className="mt-2" onClick={() => window.location.href = '/auth'}>
                Fazer Login
              </Button>
            </div>
          </Card>
        )}

        {authType !== "guest" && !isAdmin && (
          <Card className="p-6 mb-6 bg-gradient-accent text-accent-foreground border-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Baixe Nosso App!</h3>
                  <p className="text-sm opacity-90">
                    Baixe o app aqui e veja seu livro onde e como quizer
                  </p>
                </div>
              </div>
              <Button 
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => window.open('https://play.google.com/store', '_blank')}
              >
                <Download className="h-4 w-4" />
                Play Store
              </Button>
            </div>
          </Card>
        )}

        {isAdmin && (
          <Card className="p-6 mb-6 bg-gradient-primary text-primary-foreground border-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-background/20 p-3">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Painel Administrativo</h3>
                  <p className="text-sm opacity-90">
                    Gerencie livros, submissões e configurações da plataforma
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant="secondary"
                  className="gap-2 justify-start"
                  onClick={() => window.location.href = '/admin'}
                >
                  <BarChart className="h-4 w-4" />
                  Acessar Painel Admin
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2 justify-start bg-background/10 border-background/20 hover:bg-background/20"
                  onClick={() => window.location.href = '/admin?tab=import'}
                >
                  <Upload className="h-4 w-4" />
                  Importar Livros
                </Button>
              </div>
              
              {adminStatsData.pendingSubmissions > 0 && (
                <div className="bg-background/10 rounded-lg p-3 border border-background/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">
                      {adminStatsData.pendingSubmissions} {adminStatsData.pendingSubmissions === 1 ? 'submissão pendente' : 'submissões pendentes'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {isLoggedIn && authType !== "guest" && !isAdmin && (
          <Card className="p-6 mb-6 bg-secondary border-border">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Compartilhe Seus Livros</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie seus livros para análise e compartilhe com a comunidade
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.location.href = '/my-submissions'}
                >
                  <FileText className="h-4 w-4" />
                  Minhas Submissões
                </Button>
                <Button 
                  className="gap-2"
                  onClick={() => window.location.href = '/submit-book'}
                >
                  <Upload className="h-4 w-4" />
                  Enviar Livro
                </Button>
              </div>
            </div>
          </Card>
        )}


        {authType !== "guest" && !isAdmin && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Minhas Metas de Leitura</h2>
              </div>
              <Button size="sm" onClick={() => setShowNewGoal(!showNewGoal)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Meta
              </Button>
            </div>

          {showNewGoal && (
            <Card className="p-4 mb-4 bg-secondary">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="goal-title">Título da Meta</Label>
                  <Input
                    id="goal-title"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Ex: Ler 10 livros de ficção"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-target">Número de Livros</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateGoal} className="flex-1">
                    Criar Meta
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewGoal(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {goals.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="rounded-full bg-secondary p-6">
                  <Target className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">Nenhuma meta ainda</h3>
                <p className="text-muted-foreground">
                  Crie metas de leitura para acompanhar seu progresso
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {goals.map((goal) => (
                <Card key={goal.id} className="p-4 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{goal.title}</h3>
                      {goal.deadline && (
                        <p className="text-sm text-muted-foreground">
                          Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {goal.current_books} / {goal.target_books} livros
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-smooth"
                        style={{
                          width: `${(goal.current_books / goal.target_books) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateGoalProgress(goal.id, false)}
                        disabled={goal.current_books === 0}
                      >
                        -
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUpdateGoalProgress(goal.id, true)}
                        disabled={goal.current_books >= goal.target_books}
                      >
                        Marcar livro como lido
                      </Button>
                    </div>
                    {goal.completed && (
                      <div className="flex items-center gap-2 text-primary text-sm font-semibold mt-2">
                        <CheckCircle className="h-4 w-4" />
                        Meta concluída!
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
