import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Book {
  id: number;
  title: string;
  author: string;
  image: string;
  rating?: number;
}

interface LibraryContextType {
  favorites: string[];
  reading: string[];
  read: string[];
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
  const { userId, authType } = useAuth();

  // Carrega dados do localStorage para convidados ou do Supabase para usuários logados
  useEffect(() => {
    const loadLibrary = async () => {
      if (authType === "guest") {
        // Carrega do localStorage para usuários convidados
        const guestFavorites = localStorage.getItem("guest_favorites");
        const guestReading = localStorage.getItem("guest_reading");
        const guestRead = localStorage.getItem("guest_read");
        
        if (guestFavorites) setFavorites(JSON.parse(guestFavorites));
        if (guestReading) setReading(JSON.parse(guestReading));
        if (guestRead) setRead(JSON.parse(guestRead));
        return;
      }

      if (!userId) return;

      const [favData, readingData, readData] = await Promise.all([
        supabase.from("favorites").select("book_id").eq("user_id", userId),
        supabase.from("reading").select("book_id").eq("user_id", userId),
        supabase.from("read").select("book_id").eq("user_id", userId),
      ]);

      if (favData.data) setFavorites(favData.data.map((d) => d.book_id));
      if (readingData.data) setReading(readingData.data.map((d) => d.book_id));
      if (readData.data) setRead(readData.data.map((d) => d.book_id));
    };

    loadLibrary();
  }, [userId, authType]);

  // Salva no localStorage para usuários convidados
  useEffect(() => {
    if (authType === "guest") {
      localStorage.setItem("guest_favorites", JSON.stringify(favorites));
      localStorage.setItem("guest_reading", JSON.stringify(reading));
      localStorage.setItem("guest_read", JSON.stringify(read));
    }
  }, [favorites, reading, read, authType]);

  const getTotalBooks = () => favorites.length + reading.length + read.length;

  const addToFavorites = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (favorites.includes(bookId)) return true; // Já está nos favoritos
    if (maxBooks && getTotalBooks() >= maxBooks) return false;
    
    if (userId && authType !== "guest") {
      await supabase.from("favorites").insert({ user_id: userId, book_id: bookId });
    }
    
    setFavorites((prev) => [...prev, bookId]);
    return true;
  };

  const removeFromFavorites = async (bookId: string) => {
    if (userId && authType !== "guest") {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("book_id", bookId);
    }
    
    setFavorites((prev) => prev.filter((id) => id !== bookId));
  };

  const addToReading = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (reading.includes(bookId)) return true; // Já está em lendo
    if (maxBooks && getTotalBooks() >= maxBooks) return false;
    
    // Remove dos favoritos se estiver lá
    if (favorites.includes(bookId)) {
      await removeFromFavorites(bookId);
    }
    
    if (userId && authType !== "guest") {
      await supabase.from("reading").insert({ user_id: userId, book_id: bookId });
    }
    
    setReading((prev) => [...prev, bookId]);
    return true;
  };

  const removeFromReading = async (bookId: string) => {
    if (userId && authType !== "guest") {
      await supabase.from("reading").delete().eq("user_id", userId).eq("book_id", bookId);
    }
    
    setReading((prev) => prev.filter((id) => id !== bookId));
  };

  const addToRead = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (read.includes(bookId)) return true; // Já está em lidos
    if (maxBooks && getTotalBooks() >= maxBooks) return false;
    
    // Remove de 'lendo' se estiver lá
    if (reading.includes(bookId)) {
      await removeFromReading(bookId);
    }
    
    // Remove dos favoritos se estiver lá
    if (favorites.includes(bookId)) {
      await removeFromFavorites(bookId);
    }
    
    if (userId && authType !== "guest") {
      await supabase.from("read").insert({ user_id: userId, book_id: bookId });
    }
    
    setRead((prev) => [...prev, bookId]);
    return true;
  };

  const removeFromRead = async (bookId: string) => {
    if (userId && authType !== "guest") {
      await supabase.from("read").delete().eq("user_id", userId).eq("book_id", bookId);
    }
    
    setRead((prev) => prev.filter((id) => id !== bookId));
  };

  const isInFavorites = (bookId: string) => favorites.includes(bookId);
  const isInReading = (bookId: string) => reading.includes(bookId);
  const isInRead = (bookId: string) => read.includes(bookId);

  const toggleFavorite = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInFavorites(bookId)) {
      await removeFromFavorites(bookId);
      return true;
    } else {
      // Não adiciona aos favoritos se já estiver em 'lendo' ou 'lidos'
      if (isInReading(bookId) || isInRead(bookId)) {
        return true;
      }
      return await addToFavorites(bookId, maxBooks);
    }
  };

  const toggleReading = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInReading(bookId)) {
      await removeFromReading(bookId);
      return true;
    } else {
      return await addToReading(bookId, maxBooks);
    }
  };

  const toggleRead = async (bookId: string, maxBooks?: number): Promise<boolean> => {
    if (isInRead(bookId)) {
      await removeFromRead(bookId);
      return true;
    } else {
      return await addToRead(bookId, maxBooks);
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        reading,
        read,
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
