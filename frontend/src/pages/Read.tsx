import { useState, useEffect, useCallback } from "react";
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
import { toastNeedLogin } from "@/lib/loginToast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { BookViewer } from "@/components/BookViewer";
import { api } from "@/lib/api";

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
  const { userId, token, bookLimit } = useAuth();
  const { addToReading, isInRead, toggleRead } = useLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fileUrl, setFileUrl] = useState<string>("");
  /** Zoom da folha do PDF (1 = 100%; afeta apenas PDF). */
  const [pdfZoom, setPdfZoom] = useState(1);
  const [readingMode, setReadingMode] = useState<"horizontal" | "vertical">("horizontal");
  const [pageSize, setPageSize] = useState<"margins" | "fullscreen">("margins");
  const [showToc, setShowToc] = useState(false);
  const [tocItems, setTocItems] = useState<any[]>([]);

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;
      try {
        const response = await api.getBook(id);
        const data = response?.book;
        if (!data) {
          toast.error("Livro não encontrado");
          navigate("/");
          return;
        }
        setBook(data);
        const addedToReading = await addToReading(id, bookLimit);
        if (!addedToReading) {
          toastNeedLogin("Limite atingido! Faça login para adicionar mais livros.", navigate);
        }
        setFileUrl(api.getBookFileUrl(id));
      } catch (error) {
        console.error("Error loading book:", error);
        toast.error("Erro ao carregar livro");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [id, navigate, addToReading, bookLimit]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!userId || !id || !token) return;
      try {
        const { progress } = await api.getReadingProgress(id, token);
        if (progress) setCurrentPage(progress.current_page || 1);
      } catch {
        // ignore
      }
    };

    loadProgress();
  }, [userId, id, token]);

  useEffect(() => {
    const saveProgress = async () => {
      if (!userId || !id || !token) return;

      const progressPercentage = ((currentPage / totalPages) * 100).toFixed(2);

      await api.saveReadingProgress(
        id,
        {
          current_page: currentPage,
          total_pages: totalPages,
          progress_percentage: parseFloat(progressPercentage),
        },
        token
      );
    };

    const debounceTimer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(debounceTimer);
  }, [currentPage, userId, id, totalPages, token]);

  const handleToggleRead = async () => {
    if (!id) return;

    const currentlyInRead = isInRead(id);
    const success = await toggleRead(id, bookLimit);

    if (!success) {
      toastNeedLogin("Limite atingido! Faça login para adicionar mais livros.", navigate);
      return;
    }

    toast.success(currentlyInRead ? "Removido de lidos" : "Marcado como lido");
  };

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

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
  }, [currentPage, totalPages, readingMode, handleNextPage, handlePrevPage]);

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
            {readingMode === "horizontal" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleRead}
                className="gap-2"
              >
                {id && isInRead(id) ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {id && isInRead(id) ? "Lido" : "Marcar como lido"}
                </span>
              </Button>
            )}

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
                    <DropdownMenuLabel>Zoom da página (PDF)</DropdownMenuLabel>
                    <div className="px-2 py-2">
                      <Slider
                        value={[pdfZoom]}
                        onValueChange={([value]) => setPdfZoom(value)}
                        min={0.5}
                        max={2}
                        step={0.05}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>50%</span>
                        <span>{Math.round(pdfZoom * 100)}%</span>
                        <span>200%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 px-1">
                        Aumenta ou diminui o tamanho da folha do PDF na tela.
                      </p>
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
          pdfZoom={pdfZoom}
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
