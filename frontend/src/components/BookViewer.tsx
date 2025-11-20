import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import ePub from "epubjs";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configura o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookViewerProps {
  fileUrl: string;
  fileType: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  readingMode: "horizontal" | "vertical";
  pageSize?: "margins" | "fullscreen";
  onTocLoaded?: (items: any[]) => void;
  fontSize?: number;
  theme?: "light" | "sepia" | "sepia-contrast" | "dark";
  fontFamily?: "serif" | "sans" | "mono";
  fontWeight?: "normal" | "medium" | "bold";
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
  fontSize = 18,
  theme = "light",
  fontFamily = "serif",
  fontWeight = "normal"
}: BookViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [epubBook, setEpubBook] = useState<any>(null);
  const epubViewerRef = useRef<HTMLDivElement>(null);

  // Determina o tipo de arquivo pela extensão
  const getFileType = () => {
    if (fileType === 'application/pdf' || fileType === 'pdf') return 'pdf';
    if (fileType === 'application/epub+zip' || fileType === 'epub') return 'epub';
    if (fileType === 'application/x-mobipocket-ebook' || fileType === 'mobi') return 'mobi';
    return fileType;
  };

  const normalizedFileType = getFileType();

  // Visualizador de PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onTotalPagesChange(numPages);
  };

  // Visualizador de EPUB
  useEffect(() => {
    if (normalizedFileType === 'epub' && fileUrl && epubViewerRef.current) {
      const book = ePub(fileUrl);
      
      // Configura renderização com base no modo de leitura
      const rendition = book.renderTo(epubViewerRef.current, {
        width: '100%',
        height: pageSize === "fullscreen" ? '100vh' : '80vh',
        flow: readingMode === 'vertical' ? 'scrolled-doc' : 'paginated',
        spread: 'none'
      });
      
      // Aplica tema
      const themeColors = {
        light: { background: '#ffffff', color: '#000000' },
        sepia: { background: '#f4ecd8', color: '#5c4b37' },
        'sepia-contrast': { background: '#e8d7b8', color: '#3d2f1f' },
        dark: { background: '#1a1a1a', color: '#e0e0e0' }
      };
      
      rendition.themes.default(themeColors[theme]);
      
      // Aplica configurações de fonte
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
      
      // Carrega o sumário (table of contents)
      book.loaded.navigation.then((toc: any) => {
        if (onTocLoaded && toc.toc) {
          onTocLoaded(toc.toc);
        }
      });
      
      // Obtém o total de localizações para rastreamento de páginas
      book.ready.then(() => {
        return book.locations.generate(1024);
      }).then((locations: any) => {
        onTotalPagesChange(locations.length);
      });
      
      setEpubBook({ book, rendition });

      return () => {
        rendition.destroy();
      };
    }
  }, [fileUrl, normalizedFileType, onTocLoaded, readingMode, pageSize, fontSize, theme, fontFamily, fontWeight, onTotalPagesChange]);

  // Trata navegação de páginas para EPUB
  useEffect(() => {
    if (epubBook?.book && currentPage > 0) {
      epubBook.book.locations.generate(1024).then((locations: any) => {
        const cfi = locations[currentPage - 1];
        if (cfi) {
          epubBook.rendition.display(cfi);
        }
      });
    }
  }, [currentPage, epubBook]);

  if (normalizedFileType === 'pdf') {
    const maxWidth = pageSize === "fullscreen" 
      ? window.innerWidth 
      : Math.min(window.innerWidth - 100, 800);
    
    if (readingMode === 'vertical') {
      return (
        <div className="flex justify-center py-8">
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
                  width={maxWidth}
                />
              </div>
            ))}
          </Document>
        </div>
      );
    }

    return (
      <div className="flex justify-center py-8">
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
            width={maxWidth}
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
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Arquivos MOBI não são suportados para visualização web.
        </p>
        <p className="text-sm text-muted-foreground">
          Faça o download para ler em um leitor Kindle ou compatível.
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
