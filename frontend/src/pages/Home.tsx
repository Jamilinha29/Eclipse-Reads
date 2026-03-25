import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BookCard from "@/components/BookCard";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Quote {
  id: string;
  quote: string;
  author: string;
  category: string | null;
}

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_image: string | null;
  rating: number;
}

const Home = () => {
  const { isLoggedIn, authType, username, theme } = useAuth();
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const loadQuotes = async () => {
      const response = await api.getQuoteOfDay();
      setDailyQuote(response?.quote ?? null);
    };

    const loadBooks = async () => {
      const response = await api.getBooks();
      if (response?.books) {
        setBooks(response.books.slice(0, 12));
      }
    };

    loadQuotes();
    loadBooks();
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">
          Olá, {username}!
        </h1>
        <p className="text-muted-foreground text-lg">O que gostaria de ler hoje?</p>

        {(!isLoggedIn || authType === "guest") && (
          <Card className="mt-6 gradient-primary p-6 border-0 shadow-glow">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Libere Todos os Livros!</h3>
                  <p className="text-sm text-primary-foreground/90">
                    Faça login para recursos ilimitados
                  </p>
                </div>
              </div>
              <Link to="/auth">
                <Button size="sm" variant="secondary" className="gap-2 bg-white hover:bg-white/90 text-primary">
                  Fazer Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {isLoggedIn && (authType === "email" || authType === "google") && dailyQuote && (
          <Card className={`mt-6 relative overflow-hidden border-0 shadow-glow ${
            theme === "light" 
              ? "bg-gradient-to-br from-slate-400 to-slate-500 text-slate-900" 
              : "gradient-primary text-primary-foreground"
          }`}>
            <div className="absolute top-4 left-4">
              <BookOpen className={`h-6 w-6 ${theme === "light" ? "text-slate-700" : "text-primary-foreground/80"}`} />
            </div>
            
            <div className="pt-16 pb-8 px-8 text-center">
              <h3 className={`text-sm font-semibold mb-4 ${
                theme === "light" ? "text-slate-800" : "text-primary-foreground/90"
              }`}>
                Frase do Dia
              </h3>
              <p className={`text-lg italic mb-4 max-w-2xl mx-auto leading-relaxed ${
                theme === "light" ? "text-slate-900" : "text-primary-foreground"
              }`}>
                "{dailyQuote.quote}"
              </p>
              <p className={`text-sm font-medium ${
                theme === "light" ? "text-slate-700" : "text-primary-foreground/80"
              }`}>
                — {dailyQuote.author}
              </p>
            </div>
          </Card>
        )}
      </section>

      <section className="container mx-auto px-4 mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            <h2 className="text-2xl font-bold">Atualizações do Dia</h2>
          </div>
          <Link to="/search">
            <Button variant="ghost" size="sm" className="gap-2">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {books.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum livro disponível ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.slice(0, 6).map((book) => (
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
      </section>

      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Recomendados para Você</h2>
          </div>
          <Link to="/search">
            <Button variant="ghost" size="sm" className="gap-2">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {books.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum livro disponível ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.slice(6, 12).map((book) => (
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
      </section>
    </div>
  );
};

const Star = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default Home;
