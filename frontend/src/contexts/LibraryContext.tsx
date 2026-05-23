import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

function parseGuestList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  cover_image?: string | null;
  rating?: number;
  category?: string;
}

type LibraryTab = "favoritos" | "lendo" | "lidos";

interface LibraryContextType {
  favorites: string[];
  reading: string[];
  read: string[];
  libraryBooks: Record<LibraryTab, LibraryBook[]>;
  libraryLoading: boolean;
  refreshLibraryBooks: () => Promise<void>;
  addToFavorites: (bookId: string, maxBooks?: number) => Promise<boolean>;
  removeFromFavorites: (bookId: string) => Promise<void>;
  addToReading: (bookId: string, maxBooks?: number) => Promise<boolean>;
  removeFromReading: (bookId: string) => Promise<void>;
  addToRead: (bookId: string, maxBooks?: number) => Promise<boolean>;
  removeFromRead: (bookId: string) => Promise<void>;
  isInFavorites: (bookId: string) => boolean;
  isInReading: (bookId: string) => boolean;
  isInRead: (bookId: string) => boolean;
  toggleFavorite: (bookId: string, maxBooks?: number) => Promise<boolean>;
  toggleReading: (bookId: string, maxBooks?: number) => Promise<boolean>;
  toggleRead: (bookId: string, maxBooks?: number) => Promise<boolean>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reading, setReading] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<Record<LibraryTab, LibraryBook[]>>({
    favoritos: [],
    lendo: [],
    lidos: [],
  });
  const [libraryLoading, setLibraryLoading] = useState(false);
  const { userId, authType, session } = useAuth();

  const refreshLibraryBooks = async () => {
    if (authType === "guest" || !userId) {
      setLibraryBooks({ favoritos: [], lendo: [], lidos: [] });
      return;
    }
    const token = session?.access_token;
    if (!token) return;

    setLibraryLoading(true);
    try {
      const [favData, readingData, readData] = await Promise.all([
        api.getLibrary("favoritos", token),
        api.getLibrary("lendo", token),
        api.getLibrary("lidos", token),
      ]);

      setLibraryBooks({
        favoritos: (favData?.books ?? []) as LibraryBook[],
        lendo: (readingData?.books ?? []) as LibraryBook[],
        lidos: (readData?.books ?? []) as LibraryBook[],
      });
    } catch (err) {
      console.error("Erro ao carregar livros da biblioteca:", err);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    const loadLibrary = async () => {
      if (authType === "guest") {
        setFavorites(parseGuestList(localStorage.getItem("guest_favorites")));
        setReading(parseGuestList(localStorage.getItem("guest_reading")));
        setRead(parseGuestList(localStorage.getItem("guest_read")));
        setLibraryBooks({ favoritos: [], lendo: [], lidos: [] });
        return;
      }

      if (!userId) return;
      const token = session?.access_token;
      if (!token) return;

      try {
        const [favData, readingData, readData] = await Promise.all([
          api.getLibrary("favoritos", token),
          api.getLibrary("lendo", token),
          api.getLibrary("lidos", token),
        ]);

        if (favData?.books) {
          const ids = favData.books.map((d: LibraryBook) => String(d.id));
          setFavorites(Array.from(new Set(ids)));
        }
        if (readingData?.books) {
          const ids = readingData.books.map((d: LibraryBook) => String(d.id));
          setReading(Array.from(new Set(ids)));
        }
        if (readData?.books) {
          const ids = readData.books.map((d: LibraryBook) => String(d.id));
          setRead(Array.from(new Set(ids)));
        }

        setLibraryBooks({
          favoritos: (favData?.books ?? []) as LibraryBook[],
          lendo: (readingData?.books ?? []) as LibraryBook[],
          lidos: (readData?.books ?? []) as LibraryBook[],
        });
      } catch (err) {
        console.error("Erro ao carregar biblioteca:", err);
      }
    };

    loadLibrary();
  }, [userId, authType, session?.access_token]);

  useEffect(() => {
    if (authType === "guest") {
      localStorage.setItem("guest_favorites", JSON.stringify(favorites));
      localStorage.setItem("guest_reading", JSON.stringify(reading));
      localStorage.setItem("guest_read", JSON.stringify(read));
    }
  }, [favorites, reading, read, authType]);

  const getTotalBooks = () => favorites.length + reading.length + read.length;

  const addToFavorites = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (favorites.includes(bookId)) return true;
    if (maxBooks && getTotalBooks() >= maxBooks) return false;

    const prev = favorites;
    setFavorites((p) => [...p, bookId]);

    if (userId && authType !== "guest") {
      const token = session?.access_token;
      if (token) {
        try {
          await api.addToLibrary("favoritos", bookId, token);
        } catch {
          setFavorites(prev);
          return false;
        }
      }
    }
    return true;
  };

  const removeFromFavorites = async (bookId: string) => {
    const prev = favorites;
    setFavorites((p) => p.filter((id) => id !== bookId));

    if (userId && authType !== "guest") {
      const token = session?.access_token;
      if (token) {
        try {
          await api.removeFromLibrary("favoritos", bookId, token);
        } catch {
          setFavorites(prev);
        }
      }
    }
  };

  const addToReading = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (reading.includes(bookId)) return true;
    if (maxBooks && getTotalBooks() >= maxBooks) return false;

    const prevFav = favorites;
    const prevReading = reading;

    if (!favorites.includes(bookId)) {
      setFavorites((p) => [...p, bookId]);
    }
    setReading((p) => [...p, bookId]);

    const token = session?.access_token;
    if (userId && authType !== "guest" && token) {
      try {
        if (!prevFav.includes(bookId)) {
          await api.addToLibrary("favoritos", bookId, token);
        }
        await api.addToLibrary("lendo", bookId, token);
      } catch {
        setFavorites(prevFav);
        setReading(prevReading);
        return false;
      }
    }
    return true;
  };

  const removeFromReading = async (bookId: string) => {
    const prev = reading;
    setReading((p) => p.filter((id) => id !== bookId));

    if (userId && authType !== "guest") {
      const token = session?.access_token;
      if (token) {
        try {
          await api.removeFromLibrary("lendo", bookId, token);
        } catch {
          setReading(prev);
        }
      }
    }
  };

  const addToRead = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (read.includes(bookId)) return true;
    if (maxBooks && getTotalBooks() >= maxBooks) return false;

    if (reading.includes(bookId)) {
      await removeFromReading(bookId);
    }

    const prev = read;
    setRead((p) => [...p, bookId]);

    if (userId && authType !== "guest") {
      const token = session?.access_token;
      if (token) {
        try {
          await api.addToLibrary("lidos", bookId, token);
        } catch {
          setRead(prev);
          return false;
        }
      }
    }
    return true;
  };

  const removeFromRead = async (bookId: string) => {
    const prev = read;
    setRead((p) => p.filter((id) => id !== bookId));

    if (userId && authType !== "guest") {
      const token = session?.access_token;
      if (token) {
        try {
          await api.removeFromLibrary("lidos", bookId, token);
        } catch {
          setRead(prev);
        }
      }
    }
  };

  const isInFavorites = (bookId: string) => favorites.includes(bookId);
  const isInReading = (bookId: string) => reading.includes(bookId);
  const isInRead = (bookId: string) => read.includes(bookId);

  const toggleFavorite = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInFavorites(bookId)) {
      await removeFromFavorites(bookId);
      return true;
    }
    return addToFavorites(bookId, maxBooks);
  };

  const toggleReading = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInReading(bookId)) {
      await removeFromReading(bookId);
      return true;
    }
    return addToReading(bookId, maxBooks);
  };

  const toggleRead = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInRead(bookId)) {
      await removeFromRead(bookId);
      return true;
    }
    return addToRead(bookId, maxBooks);
  };

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        reading,
        read,
        libraryBooks,
        libraryLoading,
        refreshLibraryBooks,
        addToFavorites,
        removeFromFavorites,
        addToReading,
        removeFromReading,
        addToRead,
        removeFromRead,
        isInFavorites,
        isInReading,
        isInRead,
        toggleFavorite,
        toggleReading,
        toggleRead,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
};
