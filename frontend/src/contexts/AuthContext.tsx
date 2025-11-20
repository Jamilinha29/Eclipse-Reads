import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

type AuthType = "guest" | "email" | "google" | null;

interface AuthContextType {
  authType: AuthType;
  isLoggedIn: boolean;
  avatarImage: string;
  bannerImage: string;
  username: string;
  bookLimit: number;
  userId: string | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  theme: "light" | "dark";
  setAuthType: (type: AuthType) => void;
  setAvatarImage: (image: string) => void;
  setBannerImage: (image: string) => void;
  setUsername: (name: string) => void;
  setUserId: (id: string | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authType, setAuthType] = useState<AuthType>(null);
  const [avatarImage, setAvatarImage] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [username, setUsername] = useState<string>("Usuário");
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const isLoggedIn = authType !== null;
  const bookLimit = authType === "guest" ? 7 : Infinity;

  // Inicializa a autenticação do Supabase
  useEffect(() => {
    // Configura primeiro o listener de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setUserId(currentSession.user.id);
          setAuthType("email"); // Pode ser email ou google
          
          // Adia o carregamento do perfil
          setTimeout(() => {
            loadProfile(currentSession.user.id);
          }, 0);
        } else {
          setUserId(null);
          setAuthType(null);
        }
        
        setLoading(false);
      }
    );

    // Em seguida, verifica sessão existente
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        setUserId(currentSession.user.id);
        setAuthType("email");
        loadProfile(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carrega perfil do Supabase
  const loadProfile = async (userIdToLoad: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userIdToLoad)
      .maybeSingle();

    if (profileData) {
      setUsername(profileData.username || "Usuário");
      setAvatarImage(profileData.avatar_image || "");
      setBannerImage(profileData.banner_image || "");
    }

    // Carrega configurações de tema
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("theme")
      .eq("user_id", userIdToLoad)
      .maybeSingle();

    if (settingsData) {
      setTheme(settingsData.theme as "light" | "dark");
    }
  };

  // Salva perfil no Supabase
  const saveProfile = async () => {
    if (!userId || authType === "guest") return;

    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("profiles")
          .update({
            username,
            avatar_image: avatarImage,
            banner_image: bannerImage,
          })
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating profile:", error);
        }
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            username,
            avatar_image: avatarImage,
            banner_image: bannerImage,
          });

        if (error) {
          console.error("Error creating profile:", error);
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  // Salva o perfil quando os dados mudam (debounced para evitar chamadas excessivas)
  useEffect(() => {
    if (!userId || authType === "guest" || loading) return;
    
    const timeoutId = setTimeout(() => {
      saveProfile();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, avatarImage, bannerImage, userId, authType]);

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthType(null);
    setAvatarImage("");
    setBannerImage("");
    setUsername("Usuário");
    setUserId(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authType,
        isLoggedIn,
        avatarImage,
        bannerImage,
        username,
        bookLimit,
        userId,
        user,
        session,
        loading,
        theme,
        setAuthType,
        setAvatarImage,
        setBannerImage,
        setUsername,
        setUserId,
        setTheme,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
