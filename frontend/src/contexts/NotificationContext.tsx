import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface Book {
  id: string;
  title: string;
  author: string;
  created_at: string;
  cover_image?: string | null;
}

interface NotificationContextType {
  unreadCount: number;
  newBooks: Book[];
  resetCount: () => void;
  checkNewBooks: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newBooks, setNewBooks] = useState<Book[]>([]);

  const checkNewBooks = useCallback(async () => {
    if (!userId) return;

    try {
      const { settings } = await api.getMeSettings(token || "");
      if (!settings?.new_books_notifications) {
        setUnreadCount(0);
        setNewBooks([]);
        return;
      }

      const response = await api.getBooks();
      if (response?.books) {
        const books = response.books as Book[];

        const lastCheck = localStorage.getItem(`last_book_check_${userId}`);
        const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

        const newerBooks = books.filter(book => {
          const createdAt = new Date(book.created_at);
          return createdAt > lastCheckDate;
        });

        setNewBooks(newerBooks);
        setUnreadCount(newerBooks.length);

        const sessionNotified = sessionStorage.getItem(`notified_session_${userId}`);
        if (newerBooks.length > 0 && !sessionNotified) {
          toast.info("Novos livros disponíveis!", {
            description: `Você tem ${newerBooks.length} novas atualizações para conferir.`,
          });
          sessionStorage.setItem(`notified_session_${userId}`, 'true');
        }
      }
    } catch (error) {
      console.error("Erro ao verificar novos livros:", error);
    }
  }, [userId, token]);

  const resetCount = () => {
    if (!userId) return;
    const now = new Date().toISOString();
    localStorage.setItem(`last_book_check_${userId}`, now);
    setUnreadCount(0);
  };

  useEffect(() => {
    if (userId) {
      checkNewBooks();

      const interval = setInterval(checkNewBooks, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setNewBooks([]);
    }
  }, [userId, token, checkNewBooks]);

  return (
    <NotificationContext.Provider value={{ unreadCount, newBooks, resetCount, checkNewBooks }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
