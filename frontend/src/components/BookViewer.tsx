import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import ePub from "epubjs";
import { normalizeBookFileType } from "@/lib/bookFileValidation";

interface EpubRendition {
  display: (target?: string) => void;
  destroy: () => void;
  on: (event: string, cb: (location: { start?: { displayed?: { page?: number } } }) => void) => void;
  themes: {
    default: (colors: Record<string, string>) => void;
    fontSize: (size: string) => void;
    font: (font: string) => void;
    override: (prop: string, val: string) => void;
  };
}

interface EpubBook {
  renderTo: (element: HTMLElement, options: Record<string, unknown>) => EpubRendition;
  loaded: { navigation: Promise<{ toc?: unknown }> };
  ready: Promise<unknown>;
  locations: { generate: (chunk: number) => Promise<string[]> };
}
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface EpubTocItem {
  label: string;
  href?: string;
}

interface BookViewerProps {
  fileUrl: string;
  fileType: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  readingMode: "horizontal" | "vertical";
  pageSize?: "margins" | "fullscreen";
  onTocLoaded?: (items: EpubTocItem[]) => void;
  /** Multiplicador da largura da folha do PDF (1 = 100%). */
  pdfZoom?: number;
  /** href do sumário EPUB para navegação direta */
  epubTargetHref?: string | null;
  /** Atualiza página quando EPUB muda de localização */
  onEpubLocationChange?: (page: number) => void;
}

export const BookViewer = ({ 
  fileUrl, 
  fileType, 
  currentPage, 
  onPageChange,
  onTotalPagesChange,
  readingMode,
  pageSize = "margins",
  onTocLoaded,
  pdfZoom = 1,
  epubTargetHref,
  onEpubLocationChange,
}: BookViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [epubBook, setEpubBook] = useState<any>(null);
  const [epubLocations, setEpubLocations] = useState<string[]>([]);
  const epubViewerRef = useRef<HTMLDivElement>(null);

  const normalizedFileType = normalizeBookFileType(fileType);

  // Visualizador de PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onTotalPagesChange(numPages);
  };

  // Visualizador de EPUB
  useEffect(() => {
    if (normalizedFileType === 'epub' && fileUrl && epubViewerRef.current) {
      const book = ePub(fileUrl) as EpubBook;
      
      // Configura renderização com base no modo de leitura
      const rendition = book.renderTo(epubViewerRef.current, {
        width: '100%',
        height: pageSize === "fullscreen" ? '100vh' : '80vh',
        flow: readingMode === 'vertical' ? 'scrolled-doc' : 'paginated',
        spread: 'none'
      });
      
      const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const fontSize = 18;
      const fontFamily = "serif" as const;
      const fontWeight = "normal" as const;

      const themeColors = {
        light: { background: '#ffffff', color: '#000000' },
        sepia: { background: '#f4ecd8', color: '#5c4b37' },
        'sepia-contrast': { background: '#e8d7b8', color: '#3d2f1f' },
        dark: { background: '#1a1a1a', color: '#e0e0e0' }
      };
      
      rendition.themes.default(themeColors[theme]);
      
      const fontFamilies = {
        serif: 'Georgia, serif',
        sans: 'Arial, sans-serif',
        mono: 'Courier New, monospace'
      };
      
      const fontWeights = {
        normal: '400',
        medium: '500',
        bold: '700'
      };
      
      rendition.themes.fontSize(`${fontSize}px`);
      rendition.themes.font(fontFamilies[fontFamily]);
      rendition.themes.override('font-weight', fontWeights[fontWeight]);
      
      rendition.display();
      
      rendition.on("relocated", (location: { start?: { displayed?: { page?: number } } }) => {
        const page = location?.start?.displayed?.page;
        if (page && onEpubLocationChange) onEpubLocationChange(page);
      });
      
      // Carrega o sumário (table of contents)
      book.loaded.navigation.then((toc: { toc?: EpubTocItem[] }) => {
        if (onTocLoaded && toc.toc) {
          onTocLoaded(toc.toc);
        }
      });
      
      // Obtém o total de localizações para rastreamento de páginas
      book.ready.then(() => book.locations.generate(1024)).then((locations: string[]) => {
        setEpubLocations(locations);
        onTotalPagesChange(locations.length);
      });
      
      setEpubBook({ book, rendition });

      return () => {
        rendition.destroy();
      };
    }
  }, [fileUrl, normalizedFileType, onTocLoaded, readingMode, pageSize, onTotalPagesChange, onEpubLocationChange]);

  // Navegação pelo sumário EPUB (href do epub.js)
  useEffect(() => {
    if (epubBook?.rendition && epubTargetHref) {
      epubBook.rendition.display(epubTargetHref);
    }
  }, [epubTargetHref, epubBook]);

  // Trata navegação de páginas para EPUB
  useEffect(() => {
    if (epubBook?.rendition && currentPage > 0 && epubLocations.length > 0) {
      const cfi = epubLocations[currentPage - 1];
      if (cfi) epubBook.rendition.display(cfi);
    }
  }, [currentPage, epubBook, epubLocations]);

  if (normalizedFileType === 'pdf') {
    const baseMaxWidth = pageSize === "fullscreen" 
      ? window.innerWidth 
      : Math.min(window.innerWidth - 100, 800);
    const pageWidth = Math.round(baseMaxWidth * pdfZoom);
    
    if (readingMode === 'vertical') {
      return (
        <div className="flex justify-center py-8 overflow-x-auto">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="text-center py-12">Carregando PDF...</div>}
            error={<div className="text-center py-12 text-destructive">Erro ao carregar PDF</div>}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} style={{ marginBottom: '1rem' }}>
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={pageWidth}
                />
              </div>
            ))}
          </Document>
        </div>
      );
    }

    return (
      <div className="flex justify-center py-8 overflow-x-auto">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-center py-12">Carregando PDF...</div>}
          error={<div className="text-center py-12 text-destructive">Erro ao carregar PDF</div>}
        >
          <Page 
            pageNumber={currentPage} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={pageWidth}
          />
        </Document>
      </div>
    );
  }

  if (normalizedFileType === 'epub') {
    const containerHeight = pageSize === "fullscreen" ? "calc(100vh - 60px)" : "calc(100vh - 300px)";
    const containerWidth = pageSize === "fullscreen" ? "100%" : "100%";
    const containerMaxWidth = pageSize === "fullscreen" ? "100vw" : "1200px";
    
    return (
      <div 
        ref={epubViewerRef} 
        className="w-full mx-auto"
        style={{ 
          height: containerHeight,
          maxWidth: containerMaxWidth,
          width: containerWidth
        }}
      />
    );
  }

  if (normalizedFileType === 'mobi') {
    return (
      <div className="text-center py-12 max-w-md mx-auto px-4">
        <p className="text-muted-foreground mb-2">
          Este livro está em formato MOBI e ainda não pode ser lido no navegador.
        </p>
        <p className="text-sm text-muted-foreground">
          A leitura na Eclipse Reads é apenas online — não oferecemos download de arquivos.
          Escolha um título em PDF ou EPUB no catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      Tipo de arquivo não suportado
    </div>
  );
};
