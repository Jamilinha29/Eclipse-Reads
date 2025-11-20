import { Star, Heart, Eye, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLibrary } from "@/contexts/LibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  image: string;
  rating?: number;
}

const BookCard = ({ id, title, author, image, rating }: BookCardProps) => {
  const navigate = useNavigate();
  const {
    isInFavorites,
    isInReading,
    isInRead,
    toggleFavorite,
    toggleReading,
    toggleRead,
  } = useLibrary();
  const { bookLimit } = useAuth();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await toggleFavorite(id, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  const handleToggleReading = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await toggleReading(id, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await toggleRead(id, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  return (
    <Card 
      className="group relative overflow-hidden rounded-lg border-border bg-card transition-smooth hover:scale-105 hover:shadow-glow cursor-pointer max-w-[180px]"
      onClick={() => navigate(`/book/${id}`)}
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-smooth group-hover:scale-110"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-smooth h-6 w-6 p-0 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              +
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleToggleFavorite}>
              <Heart className={`h-4 w-4 mr-2 ${isInFavorites(id) ? "fill-primary text-primary" : ""}`} />
              {isInFavorites(id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleReading}>
              <Eye className={`h-4 w-4 mr-2 ${isInReading(id) ? "text-primary" : ""}`} />
              {isInReading(id) ? "Remover de lendo" : "Marcar como lendo"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleRead}>
              <Check className={`h-4 w-4 mr-2 ${isInRead(id) ? "text-primary" : ""}`} />
              {isInRead(id) ? "Remover de lidos" : "Marcar como lido"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="absolute top-1.5 left-1.5 flex gap-1">
        {isInFavorites(id) && (
          <div className="rounded-full bg-primary/90 backdrop-blur p-1">
            <Heart className="h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
          </div>
        )}
        {isInReading(id) && (
          <div className="rounded-full bg-secondary/90 backdrop-blur p-1">
            <Eye className="h-2.5 w-2.5 text-foreground" />
          </div>
        )}
        {isInRead(id) && (
          <div className="rounded-full bg-accent/90 backdrop-blur p-1">
            <Check className="h-2.5 w-2.5 text-accent-foreground" />
          </div>
        )}
      </div>
      
      <div className="p-2">
        <h3 className="font-semibold text-xs line-clamp-1">{title}</h3>
        <p className="text-[10px] text-muted-foreground line-clamp-1">{author}</p>
      </div>
    </Card>
  );
};

export default BookCard;
