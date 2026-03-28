import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, BookOpen, User, Settings, Crown, Shield, Bell } from "lucide-react";
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
import { useNotifications } from "@/contexts/NotificationContext";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { avatarImage, username, logout, userId, token } = useAuth();
  const { unreadCount, newBooks, resetCount } = useNotifications();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId || !token) return;
      const result = await api.getMeAdmin(token);
      setIsAdmin(!!result.isAdmin);
    };
    
    checkAdmin();
  }, [userId, token]);

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

        <div className="flex items-center gap-2">
          <DropdownMenu onOpenChange={(open) => open && resetCount()}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-bold text-sm">Notificações</h3>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {newBooks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma novidade por aqui.
                  </div>
                ) : (
                  newBooks.map((book) => (
                    <DropdownMenuItem 
                      key={book.id} 
                      className="cursor-pointer p-3 focus:bg-accent"
                      onClick={() => navigate(`/book/${book.id}`)}
                    >
                      <div className="flex gap-3 items-center w-full">
                        {book.cover_image ? (
                          <img src={book.cover_image} alt={book.title} className="h-10 w-8 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="h-10 w-8 bg-muted rounded flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className="font-semibold text-sm truncate">{book.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              {newBooks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer justify-center text-xs text-primary font-medium p-2"
                    onClick={() => navigate('/search')}
                  >
                    Ver todos os livros
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
