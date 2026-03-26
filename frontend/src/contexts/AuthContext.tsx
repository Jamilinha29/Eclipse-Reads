import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GUEST_AUTH_FLAG_KEY,
  GUEST_AVATAR_KEY,
  GUEST_BANNER_KEY,
} from "@/integrations/supabase/profileMediaStorage";
import { THEME_STORAGE_KEY, getStoredTheme } from "@/lib/themeStorage";
import { api } from "@/lib/api";
import { User, Session } from "@supabase/supabase-js";

type AuthType = "guest" | "email" | "google" | null;

function getDisplayNameFromUser(currentUser: User | null): string {
  if (!currentUser) return "Usuário";
  const fullName = currentUser.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const emailName = currentUser.email?.split("@")[0];
  if (emailName && emailName.trim()) return emailName.trim();
  return "Usuário";
}

function authTypeFromUser(user: User | null): Exclude<AuthType, null> {
  if (!user) return "email";
  const provider = user.app_metadata?.provider;
  if (provider === "google") return "google";
  return "email";
}

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
  token: string | null;
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
  const [profileReady, setProfileReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => getStoredTheme() ?? "dark");

  const isLoggedIn = authType !== null;
  const bookLimit = authType === "guest" ? 7 : Infinity;

  const loadProfile = useCallback(async (userIdToLoad: string, currentUser: User | null, accessToken: string) => {
    const fallbackName = getDisplayNameFromUser(currentUser);

    const { profile } = await api.getMeProfile(accessToken);
    const resolvedName = profile?.username || fallbackName;
    setUsername(resolvedName);
    setAvatarImage(profile?.avatar_image || "");
    setBannerImage(profile?.banner_image || "");

    if ((!profile || !profile.username) && fallbackName !== "Usuário") {
      await api.updateMeProfile({ username: fallbackName }, accessToken);
    }

    const { settings } = await api.getMeSettings(accessToken);
    const t = settings?.theme;
    if (t === "light" || t === "dark") {
      setTheme(t);
    } else {
      const stored = getStoredTheme();
      if (stored) setTheme(stored);
    }
  }, []);

  // Inicializa a autenticação do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        localStorage.removeItem(GUEST_AUTH_FLAG_KEY);
        setUserId(currentSession.user.id);
        setAuthType(authTypeFromUser(currentSession.user));
        setUsername(getDisplayNameFromUser(currentSession.user));
        setProfileReady(false);

        const token = currentSession.access_token;
        loadProfile(currentSession.user.id, currentSession.user, token)
          .catch((e) => console.error("loadProfile:", e))
          .finally(() => setProfileReady(true));
      } else {
        setProfileReady(false);
        setUserId(null);
        if (localStorage.getItem(GUEST_AUTH_FLAG_KEY) === "guest") {
          setAuthType("guest");
          setAvatarImage(localStorage.getItem(GUEST_AVATAR_KEY) || "");
          setBannerImage(localStorage.getItem(GUEST_BANNER_KEY) || "");
        } else {
          setAuthType(null);
          setAvatarImage("");
          setBannerImage("");
        }
      }

      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        localStorage.removeItem(GUEST_AUTH_FLAG_KEY);
        setUserId(currentSession.user.id);
        setAuthType(authTypeFromUser(currentSession.user));
        setUsername(getDisplayNameFromUser(currentSession.user));
        setProfileReady(false);

        const token = currentSession.access_token;
        loadProfile(currentSession.user.id, currentSession.user, token)
          .catch((e) => console.error("loadProfile:", e))
          .finally(() => setProfileReady(true));
      } else if (localStorage.getItem(GUEST_AUTH_FLAG_KEY) === "guest") {
        setUserId(null);
        setAuthType("guest");
        setAvatarImage(localStorage.getItem(GUEST_AVATAR_KEY) || "");
        setBannerImage(localStorage.getItem(GUEST_BANNER_KEY) || "");
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const saveProfile = async () => {
    if (!userId || authType === "guest") return;
    const accessToken = session?.access_token ?? null;
    if (!accessToken) return;

    try {
      await api.updateMeProfile(
        {
          username,
          avatar_image: avatarImage || undefined,
          banner_image: bannerImage || undefined,
        },
        accessToken
      );
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  useEffect(() => {
    if (!userId || authType === "guest" || loading || !profileReady || !session?.access_token) return;

    const timeoutId = setTimeout(() => {
      saveProfile();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, avatarImage, bannerImage, userId, authType, loading, profileReady, session?.access_token]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(GUEST_AUTH_FLAG_KEY);
    localStorage.removeItem(GUEST_AVATAR_KEY);
    localStorage.removeItem(GUEST_BANNER_KEY);
    setProfileReady(false);
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
        token: session?.access_token ?? null,
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
