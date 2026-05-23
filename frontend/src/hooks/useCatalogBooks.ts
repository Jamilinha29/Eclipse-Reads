import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CatalogBook,
  fetchCatalogWithRetry,
  getCatalogUserMessage,
} from "@/lib/catalogLoad";

export type CatalogStatus = "loading" | "retrying" | "ready" | "empty" | "error";

export function useCatalogBooks(limit?: number) {
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage(null);

    try {
      const list = await fetchCatalogWithRetry(() => api.getBooks(), (attempt) => {
        setStatus("retrying");
        setMessage(getCatalogUserMessage(null, true));
        void attempt;
      });

      const sliced = limit != null ? list.slice(0, limit) : list;
      setBooks(sliced);
      setStatus(sliced.length === 0 ? "empty" : "ready");
      setMessage(null);
    } catch (err) {
      setBooks([]);
      setStatus("error");
      setMessage(getCatalogUserMessage(err, false));
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onOnline = () => {
      if (status === "error") void load();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [status, load]);

  return { books, status, message, reload: load };
}
