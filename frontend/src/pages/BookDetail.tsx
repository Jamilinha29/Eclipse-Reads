import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Heart, Eye, Check, Star, Calendar, FileText, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLibrary } from "@/contexts/LibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ReviewSection } from "@/components/ReviewSection";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  category: string;
  cover_image: string | null;
  rating: number;
  created_at: string;
}

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    isInFavorites,
    isInReading,
    isInRead,
    toggleFavorite,
    toggleReading,
    toggleRead,
  } = useLibrary();
  const { bookLimit } = useAuth();

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error loading book:", error);
        toast.error("Erro ao carregar livro");
      } else if (!data) {
        toast.error("Livro não encontrado");
      } else {
        setBook(data);
      }
      
      setLoading(false);
    };

    loadBook();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando livro...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Livro não encontrado</h1>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  const handleToggleFavorite = async () => {
    const success = await toggleFavorite(id!, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  const handleToggleReading = async () => {
    const success = await toggleReading(id!, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  const handleToggleRead = async () => {
    const success = await toggleRead(id!, bookLimit);
    if (!success) {
      toast.error("Limite atingido! Faça login para adicionar mais livros.");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Confira ${book.title} por ${book.author}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-8 mb-8">
          <div>
            <Card className="overflow-hidden p-0">
              <img
                src={book.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                alt={book.title}
                className="w-full aspect-[2/3] object-cover"
              />
            </Card>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">por {book.author}</p>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 fill-accent text-accent" />
                <span className="text-lg font-semibold">{book.rating}</span>
                <span className="text-muted-foreground">/ 5 avaliações</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1 min-w-[140px] gap-2"
                size="lg"
                onClick={() => {
                  handleToggleReading();
                  navigate(`/read/${id}`);
                }}
                variant={isInReading(id!) ? "secondary" : "default"}
              >
                <Eye className="h-4 w-4" />
                {isInReading(id!) ? "Continuar Leitura" : "Começar Leitura"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleToggleFavorite}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isInFavorites(id!) ? "fill-primary text-primary" : ""
                  }`}
                />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleToggleRead}
              >
                <Check
                  className={`h-4 w-4 ${
                    isInRead(id!) ? "text-primary" : ""
                  }`}
                />
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-xs">Faixa Etária</div>
                  <div className="font-semibold">{(book as any).age_rating || 'Livre'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-xs">Categoria</div>
                  <div className="font-semibold">{book.category}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="sinopse" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="sinopse"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Sinopse
            </TabsTrigger>
            <TabsTrigger
              value="avaliacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Avaliações
            </TabsTrigger>
            <TabsTrigger
              value="detalhes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Detalhes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sinopse" className="mt-6">
            <Card className="p-6 bg-secondary/30 border-primary/10">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Sinopse</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {book.description || `Uma narrativa envolvente de ${book.author}, este livro apresenta uma trama
                    fascinante que cativa leitores de todas as idades. Com personagens bem
                    desenvolvidos e reviravoltas inesperadas, ${book.title} é uma leitura
                    obrigatória que explora temas profundos e universais com sensibilidade e
                    maestria literária.`}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="avaliacoes" className="mt-6">
            <ReviewSection bookId={id!} />
          </TabsContent>

          <TabsContent value="detalhes" className="mt-6">
            <Card className="p-6 bg-secondary/30 border-primary/10">
              <h3 className="font-bold text-lg mb-4">Detalhes</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Autor</div>
                  <div className="font-semibold">{book.author}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Categoria</div>
                  <div className="font-semibold">{book.category}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Ano de Lançamento</div>
                  <div className="font-semibold">{new Date(book.created_at).getFullYear()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Faixa Etária</div>
                  <div className="font-semibold flex items-center gap-2">
                    {(book as any).age_rating || 'Livre'}
                    {(book as any).age_rating && (book as any).age_rating !== 'Livre' && (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BookDetail;
