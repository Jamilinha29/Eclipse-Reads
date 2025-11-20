import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, BookOpen, User, Settings, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { avatarImage, username, logout, userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    checkAdmin();
  }, [userId]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
          <img src={logo} alt="Eclipse Reads" className="h-8 w-8" />
          <span className="text-lg font-bold">Eclipse Reads</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link to="/search">
            <Button
              variant={isActive("/search") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </Link>
          <Link to="/library">
            <Button
              variant={isActive("/library") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Biblioteca
            </Button>
          </Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-9 w-9 bg-primary">
                {avatarImage ? (
                  <AvatarImage src={avatarImage} className="object-cover object-center" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Ver Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/plan" className="cursor-pointer">
                <Crown className="mr-2 h-4 w-4" />
                Plano
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  Painel Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="md:hidden flex items-center justify-around border-t border-border bg-background py-2 px-4">
        <Link to="/">
          <Button
            variant={isActive("/") ? "secondary" : "ghost"}
            size="sm"
            className="flex-col h-auto py-2 gap-1"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
        </Link>
        <Link to="/search">
          <Button
            variant={isActive("/search") ? "secondary" : "ghost"}
            size="sm"
            className="flex-col h-auto py-2 gap-1"
          >
            <Search className="h-5 w-5" />
            <span className="text-xs">Buscar</span>
          </Button>
        </Link>
        <Link to="/library">
          <Button
            variant={isActive("/library") ? "secondary" : "ghost"}
            size="sm"
            className="flex-col h-auto py-2 gap-1"
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-xs">Biblioteca</span>
          </Button>
        </Link>
      </nav>
    </header>
  );
};

export default Header;
