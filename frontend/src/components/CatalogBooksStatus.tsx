import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogStatus } from "@/hooks/useCatalogBooks";

interface CatalogBooksStatusProps {
  status: CatalogStatus;
  message: string | null;
  onRetry?: () => void;
}

const CatalogBooksStatus = ({ status, message, onRetry }: CatalogBooksStatusProps) => {
  if (status === "loading" || status === "retrying") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm">{status === "retrying" ? message ?? "Reconectando ao catálogo…" : "Carregando livros…"}</p>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-2">
        <p className="text-sm">Ainda não há livros no catálogo.</p>
        <p className="text-xs">Novidades aparecerão aqui quando forem publicadas.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center max-w-md mx-auto">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default CatalogBooksStatus;
