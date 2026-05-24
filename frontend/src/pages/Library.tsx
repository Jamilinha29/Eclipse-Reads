import { useState, useEffect, useMemo } from "react";
import { Heart, Eye, Check, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLibrary, type LibraryBook } from "@/contexts/LibraryContext";
import { useAuth } from "@/contexts/AuthContext";
import BookCard from "@/components/BookCard";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { resolveBookCoverUrl } from "@/lib/coverPlaceholder";

const Library = () => {
  const [activeTab, setActiveTab] = useState<"favoritos" | "lendo" | "lidos">("favoritos");
  const { favorites, reading, read, libraryBooks, libraryLoading } = useLibrary();
  const { authType, bookLimit } = useAuth();
  const [guestCatalog, setGuestCatalog] = useState<LibraryBook[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);

  const isGuest = authType === "guest";
  const hasReachedLimit = isGuest && favorites.length + reading.length + read.length >= bookLimit;

  const activeIds = useMemo(() => {
    if (activeTab === "favoritos") return favorites;
    if (activeTab === "lendo") return reading;
    return read;
  }, [activeTab, favorites, reading, read]);

  useEffect(() => {
    if (!isGuest) return;

    const loadGuestCatalog = async () => {
      setGuestLoading(true);
      try {
        const response = await api.getBooks();
        if (response?.books) setGuestCatalog(response.books as LibraryBook[]);
      } catch {
        setGuestCatalog([]);
      } finally {
        setGuestLoading(false);
      }
    };

    loadGuestCatalog();
  }, [isGuest]);

  const displayBooks = isGuest
    ? guestCatalog.filter((book) => activeIds.includes(String(book.id)))
    : libraryBooks[activeTab];

  const loading = isGuest ? guestLoading : libraryLoading;

  const emptyMessages = {
    favoritos: {
      title: "Nenhum favorito ainda",
      description: "Explore nosso catálogo e adicione livros aos seus favoritos.",
      showSearch: true,
    },
    lendo: {
      title: "Nenhum livro em leitura",
      description: "Comece a ler e adicione livros aqui.",
      showSearch: false,
    },
    lidos: {
      title: "Nenhum livro lido",
      description: "Termine uma leitura e marque aqui.",
      showSearch: false,
    },
  };

  const empty = emptyMessages[activeTab];

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <h1 className="text-4xl font-bold mb-8">Minha Biblioteca</h1>

        {isGuest && (
          <Alert className="mb-6 border-accent bg-accent/10">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm">
                Modo Convidado: Você pode adicionar até {bookLimit} livros no total.{" "}
                <strong>
                  {favorites.length + reading.length + read.length}/{bookLimit}
                </strong>{" "}
                usados.
              </span>
              <Link to="/auth">
                <Button size="sm" variant="default">
                  Fazer Login para Liberar
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {hasReachedLimit && (
          <Alert className="mb-6 border-destructive/50">
            <AlertDescription>Limite de livros atingido no modo convidado.</AlertDescription>
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

        {activeIds.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <div className="rounded-full bg-secondary p-6">
                {activeTab === "favoritos" && <Heart className="h-12 w-12 text-muted-foreground" />}
                {activeTab === "lendo" && <Eye className="h-12 w-12 text-muted-foreground" />}
                {activeTab === "lidos" && <Check className="h-12 w-12 text-muted-foreground" />}
              </div>
              <h2 className="text-2xl font-bold">{empty.title}</h2>
              <p className="text-muted-foreground">{empty.description}</p>
              {empty.showSearch && (
                <Link to="/search">
                  <Button className="gap-2 mt-2">
                    <BookOpen className="h-4 w-4" />
                    Buscar livros
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                image={resolveBookCoverUrl(book.cover_image)}
                rating={book.rating ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Library;
