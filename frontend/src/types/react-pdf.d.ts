declare module 'react-pdf' {
  import { ReactElement } from 'react';

  export interface DocumentProps {
    file: string | File | { url: string } | ArrayBuffer;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    loading?: ReactElement | string;
    error?: ReactElement | string;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    width?: number;
    height?: number;
    scale?: number;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;
  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    version: string;
  };
}

declare module 'epubjs' {
  export default function ePub(url: string): any;
}
