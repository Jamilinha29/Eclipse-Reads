import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Menu, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { BookViewer } from "@/components/BookViewer";

interface Book {
  id: string;
  title: string;
  author: string;
  file_path: string;
  file_type: string;
}

const Read = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, bookLimit } = useAuth();
  const { addToReading } = useLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<"light" | "sepia" | "sepia-contrast" | "dark">("light");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">("serif");
  const [fontWeight, setFontWeight] = useState<"normal" | "medium" | "bold">("normal");
  const [readingMode, setReadingMode] = useState<"horizontal" | "vertical">("horizontal");
  const [pageSize, setPageSize] = useState<"margins" | "fullscreen">("margins");
  const [showToc, setShowToc] = useState(false);
  const [tocItems, setTocItems] = useState<any[]>([]);

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, file_path, file_type")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error loading book:", error);
        toast.error("Erro ao carregar livro");
        navigate("/");
      } else if (!data) {
        toast.error("Livro não encontrado");
        navigate("/");
      } else {
        setBook(data);
        
        // Adiciona automaticamente a tag "lendo" quando abrir o livro
        await addToReading(id, bookLimit);
        
        if (data.file_path) {
          const { data: urlData } = supabase.storage
            .from('books')
            .getPublicUrl(data.file_path);
          
          if (urlData) {
            setFileUrl(urlData.publicUrl);
          }
        }
      }
      
      setLoading(false);
    };

    loadBook();
  }, [id, navigate]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!userId || !id) return;

      const { data } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("book_id", id)
        .maybeSingle();

      if (data) {
        setCurrentPage(data.current_page || 1);
      }
    };

    loadProgress();
  }, [userId, id]);

  useEffect(() => {
    const saveProgress = async () => {
      if (!userId || !id) return;

      const progressPercentage = ((currentPage / totalPages) * 100).toFixed(2);

      await supabase
        .from("reading_progress")
        .upsert({
          user_id: userId,
          book_id: id,
          current_page: currentPage,
          total_pages: totalPages,
          progress_percentage: parseFloat(progressPercentage),
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,book_id'
        });
    };

    const debounceTimer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(debounceTimer);
  }, [currentPage, userId, id, totalPages]);

  const handleToggleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Marcador removido" : "Página marcada");
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleTocLoaded = (items: any[]) => {
    setTocItems(items);
  };

  useEffect(() => {
    if (readingMode !== "horizontal") return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Home") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "End") {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, readingMode]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            
            <div className="hidden md:block">
              <h2 className="font-semibold text-sm">{book.title}</h2>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleBookmark}
              className="gap-2"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isBookmarked ? "Marcado" : "Marcar"}
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-background z-[100] p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2">
                    <DropdownMenuLabel>Modo de Leitura</DropdownMenuLabel>
                    <div className="px-2 py-2 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant={readingMode === "horizontal" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setReadingMode("horizontal")}
                          className="flex-1"
                        >
                          Horizontal
                        </Button>
                        <Button
                          variant={readingMode === "vertical" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setReadingMode("vertical")}
                          className="flex-1"
                        >
                          Vertical
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground px-1">
                        {readingMode === "horizontal" 
                          ? "Use setas ou teclas Home/End para navegar" 
                          : "Role a página para ler"}
                      </p>
                    </div>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tamanho da Fonte</DropdownMenuLabel>
                    <div className="px-2 py-2">
                      <Slider
                        value={[fontSize]}
                        onValueChange={([value]) => setFontSize(value)}
                        min={12}
                        max={24}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>12px</span>
                        <span>{fontSize}px</span>
                        <span>24px</span>
                      </div>
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tema</DropdownMenuLabel>
                    <div className="px-2 py-2 grid grid-cols-2 gap-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                      >
                        Claro
                      </Button>
                      <Button
                        variant={theme === "sepia" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("sepia")}
                      >
                        Sépia
                      </Button>
                      <Button
                        variant={theme === "sepia-contrast" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("sepia-contrast")}
                      >
                        Sépia Alto
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                      >
                        Escuro
                      </Button>
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Família da Fonte</DropdownMenuLabel>
                    <div className="px-2 py-2 grid grid-cols-3 gap-2">
                      <Button
                        variant={fontFamily === "serif" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontFamily("serif")}
                      >
                        Serif
                      </Button>
                      <Button
                        variant={fontFamily === "sans" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontFamily("sans")}
                      >
                        Sans
                      </Button>
                      <Button
                        variant={fontFamily === "mono" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontFamily("mono")}
                      >
                        Mono
                      </Button>
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Peso da Fonte</DropdownMenuLabel>
                    <div className="px-2 py-2 grid grid-cols-3 gap-2">
                      <Button
                        variant={fontWeight === "normal" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontWeight("normal")}
                      >
                        Normal
                      </Button>
                      <Button
                        variant={fontWeight === "medium" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontWeight("medium")}
                      >
                        Médio
                      </Button>
                      <Button
                        variant={fontWeight === "bold" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontWeight("bold")}
                      >
                        Negrito
                      </Button>
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tamanho da Página</DropdownMenuLabel>
                    <div className="px-2 py-2 grid grid-cols-2 gap-2">
                      <Button
                        variant={pageSize === "margins" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPageSize("margins")}
                      >
                        Com Margens
                      </Button>
                      <Button
                        variant={pageSize === "fullscreen" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPageSize("fullscreen")}
                      >
                        Tela Cheia
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {book?.file_type === 'epub' && tocItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-[100] max-h-96 overflow-y-auto w-64">
                  <DropdownMenuLabel>Sumário</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tocItems.map((item, index) => (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className="cursor-pointer"
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <BookViewer
          fileUrl={fileUrl}
          fileType={book.file_type}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onTotalPagesChange={setTotalPages}
          readingMode={readingMode}
          pageSize={pageSize}
          onTocLoaded={handleTocLoaded}
          fontSize={fontSize}
          theme={theme}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
        />
      </main>

      {readingMode === "horizontal" && (
        <footer className="sticky bottom-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Próxima
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Read;
