import { useState, useEffect } from "react";
import { Heart, Eye, Check, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLibrary } from "@/contexts/LibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import BookCard from "@/components/BookCard";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const Library = () => {
  const [activeTab, setActiveTab] = useState<"favoritos" | "lendo" | "lidos">("favoritos");
  const { favorites, reading, read } = useLibrary();
  const { authType, bookLimit } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isGuest = authType === "guest";
  const hasReachedLimit = isGuest && (favorites.length + reading.length + read.length) >= bookLimit;

  useEffect(() => {
    const loadBooks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*');
      
      if (!error && data) {
        setBooks(data);
      }
      setLoading(false);
    };

    loadBooks();
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <h1 className="text-4xl font-bold mb-8">Minha Biblioteca</h1>

        {isGuest && (
          <Alert className="mb-6 border-accent bg-accent/10">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm">
                Modo Convidado: Você pode adicionar até {bookLimit} livros no total. {" "}
                <strong>{favorites.length + reading.length + read.length}/{bookLimit}</strong> usados.
              </span>
              <Link to="/auth">
                <Button size="sm" variant="default">
                  Fazer Login para Liberar
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          <Button
            variant={activeTab === "favoritos" ? "default" : "secondary"}
            onClick={() => setActiveTab("favoritos")}
            className="gap-2"
          >
            <Heart className="h-4 w-4" />
            Favoritos
          </Button>
          <Button
            variant={activeTab === "lendo" ? "default" : "secondary"}
            onClick={() => setActiveTab("lendo")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Lendo
          </Button>
          <Button
            variant={activeTab === "lidos" ? "default" : "secondary"}
            onClick={() => setActiveTab("lidos")}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Lidos
          </Button>
        </div>

        {activeTab === "favoritos" && (
          <>
            {favorites.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="rounded-full bg-secondary p-6">
                    <Heart className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">Nenhum favorito ainda</h2>
                  <p className="text-muted-foreground">
                    Explore nosso catálogo e adicione livros aos seus favoritos.
                  </p>
                  <Link to="/search">
                    <Button className="gap-2 mt-2">
                      <BookOpen className="h-4 w-4" />
                      Buscar livros
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : loading ? (
              <div className="text-center py-12">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {books
                  .filter((book) => favorites.includes(book.id))
                  .map((book) => (
                    <BookCard 
                      key={book.id} 
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      image={book.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                      rating={book.rating}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {activeTab === "lendo" && (
          <>
            {reading.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="rounded-full bg-secondary p-6">
                    <Eye className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">Nenhum livro em leitura</h2>
                  <p className="text-muted-foreground">
                    Comece a ler e adicione livros aqui.
                  </p>
                </div>
              </Card>
            ) : loading ? (
              <div className="text-center py-12">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {books
                  .filter((book) => reading.includes(book.id))
                  .map((book) => (
                    <BookCard 
                      key={book.id} 
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      image={book.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                      rating={book.rating}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {activeTab === "lidos" && (
          <>
            {read.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="rounded-full bg-secondary p-6">
                    <Check className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">Nenhum livro lido</h2>
                  <p className="text-muted-foreground">
                    Termine uma leitura e marque aqui.
                  </p>
                </div>
              </Card>
            ) : loading ? (
              <div className="text-center py-12">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {books
                  .filter((book) => read.includes(book.id))
                  .map((book) => (
                    <BookCard 
                      key={book.id} 
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      image={book.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                      rating={book.rating}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Library;
