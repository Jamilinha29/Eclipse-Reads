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

  // 🔥 CORREÇÃO: garantir que o perfil exista (REMOVIDO DUPLICADO)
  useEffect(() => {
    const ensureProfileExists = async () => {
      if (!userId) return;

      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!data) {
        await supabase.from("profiles").insert({
          user_id: userId,
          username: username,
        });
      }
    };

    ensureProfileExists();
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

  const stats = isAdmin
    ? [
        { icon: Book, label: "Total Livros", value: adminStatsData.totalBooks },
        { icon: CheckCircle, label: "Aprovados", value: adminStatsData.approvedSubmissions },
        { icon: Clock, label: "Pendentes", value: adminStatsData.pendingSubmissions },
        { icon: Award, label: "Categorias", value: adminStatsData.totalCategories },
      ]
    : [
        { icon: Heart, label: "Favoritos", value: favorites.length },
        { icon: Book, label: "Lendo", value: reading.length },
        { icon: CheckCircle, label: "Lidos", value: read.length },
        { icon: Clock, label: "Leitura", value: 0 },
        { icon: Award, label: "Metas", value: goals.length },
        { icon: Target, label: "Conquistas", value: 0 },
      ];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 🔥 evitar sobrescrever dados
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const finalUrl = publicUrl + '?t=' + Date.now();

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          avatar_image: finalUrl,
          banner_image: currentProfile?.banner_image || null,
          username: username,
        });

      if (dbError) throw dbError;

      setAvatarImage(finalUrl);

      toast({ title: "Avatar atualizado!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar avatar", variant: "destructive" });
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const finalUrl = publicUrl + '?t=' + Date.now();

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          banner_image: finalUrl,
          avatar_image: currentProfile?.avatar_image || null,
          username: username,
        });

      if (dbError) throw dbError;

      setBannerImage(finalUrl);

      toast({ title: "Banner atualizado!" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar banner", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">

        {/* Banner */}
        <Card className="p-0 mb-6 overflow-hidden">
          <div className="relative h-32 group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
            {bannerImage && (
              <img src={bannerImage} className="w-full h-full object-cover" />
            )}
            <input ref={bannerInputRef} type="file" onChange={handleBannerChange} className="hidden"/>
          </div>

          {/* Avatar */}
          <div className="p-6">
            <div className="flex items-center gap-4 -mt-16">
              <div onClick={() => avatarInputRef.current?.click()}>
                <Avatar className="h-24 w-24">
                  {avatarImage ? <AvatarImage src={avatarImage}/> : <AvatarFallback>U</AvatarFallback>}
                </Avatar>
                <input ref={avatarInputRef} type="file" onChange={handleAvatarChange} className="hidden"/>
              </div>

              <div>
                <h1 className="text-2xl font-bold">{username}</h1>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {stats.map((stat) => (
                <Card key={stat.label} className="p-4 text-center">
                  <stat.icon className="mx-auto mb-2"/>
                  <div>{stat.value}</div>
                  <div>{stat.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </Card>

      </section>
    </div>
  );
};

export default Profile;