import { useState, useEffect } from "react";
import { Search as SearchIcon, Sparkles, Clock, ArrowRight, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 24;

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_image: string | null;
  rating: number;
}

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const parseCategories = (categoryRaw: string) =>
  categoryRaw
    .split(/[;,/|]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Todos os Gêneros");
  const [books, setBooks] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const genres = [
    "Todos os Gêneros",
    "Ficção",
    "Aventura",
    "Romance",
    "Fantasia",
    "Poesia",
    "Drama",
    "Ficção Científica",
    "Mistério",
    "Thriller",
    "Terror",
    "Autoajuda",
    "Psicologico",
    "Suspense",
    "Biografia",
    "Literatura Infantil",
    "Literatura Juvenil",
    "Literatura Estrangeira",
    "Literatura Nacional",
  ];

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoadError(null);
        const response = await api.getBooks();
        if (response?.books) {
          const seen = new Set();
          const unique = response.books.filter((b: Book) => {
            const key = `${b.title.toLowerCase() || 'unnamed'}-${b.author.toLowerCase() || 'unknown'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setBooks(unique);
        }
      } catch {
        setLoadError("Não foi possível carregar os livros.");
        toast.error("Erro ao carregar catálogo");
      }
    };

    loadBooks();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedGenre]);

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const selectedGenreNormalized = normalizeText(selectedGenre);
    const categories = parseCategories(book.category || "");
    const matchesGenre =
      selectedGenre === "Todos os Gêneros" ||
      categories.includes(selectedGenreNormalized);
    
    return matchesSearch && matchesGenre;
  });

  const visibleBooks = filteredBooks.slice(0, visibleCount);
  const hasMore = visibleCount < filteredBooks.length;

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <h1 className="text-4xl font-bold mb-2">Buscar livros</h1>
        <p className="text-muted-foreground mb-6">
          Descubra sua próxima leitura favorita
        </p>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-2xl">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título, autor ou gênero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="h-12 gap-2 min-w-[200px]">
                {selectedGenre}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
              {genres.map((genre) => (
                <DropdownMenuItem
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={selectedGenre === genre ? "bg-secondary" : ""}
                >
                  {genre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-bold">Resultados da busca</h2>
            {filteredBooks.length > 0 && (
              <span className="text-muted-foreground">({filteredBooks.length} livros)</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loadError ? (
            <div className="col-span-full text-center py-12 text-destructive">{loadError}</div>
          ) : filteredBooks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum livro encontrado
            </div>
          ) : (
            visibleBooks.map((book) => (
              <BookCard 
                key={`new-${book.id}`} 
                id={book.id}
                title={book.title}
                author={book.author}
                image={book.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                rating={book.rating}
              />
            ))
          )}
        </div>
        
        {filteredBooks.length > 0 && hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 px-8"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              MAIS LIVROS RECENTES
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Search;
