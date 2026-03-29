import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const checkNewBooks = useCallback(async () => {
    if (!userId) return;

    try {
      // Carregar configurações do usuário para ver se notificações estão ativas
      const { settings } = await api.getMeSettings(token || "");
      if (!settings?.new_books_notifications) {
        setUnreadCount(0);
        setNewBooks([]);
        return;
      }

      const response = await api.getBooks();
      if (response?.books) {
        const books = response.books as Book[];
        
        // Obter o timestamp da última verificação do localStorage
        const lastCheck = localStorage.getItem(`last_book_check_${userId}`);
        const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

        const newerBooks = books.filter(book => {
          const createdAt = new Date(book.created_at);
          return createdAt > lastCheckDate;
        });

        setNewBooks(newerBooks);
        setUnreadCount(newerBooks.length);

        // Se houver novos livros e for a primeira vez na sessão, mostra um toast
        const sessionNotified = sessionStorage.getItem(`notified_session_${userId}`);
        if (newerBooks.length > 0 && !sessionNotified) {
          toast({
            title: "Novos livros disponíveis!",
            description: `Você tem ${newerBooks.length} novas atualizações para conferir.`,
          });
          sessionStorage.setItem(`notified_session_${userId}`, 'true');
        }
      }
    } catch (error) {
      console.error("Erro ao verificar novos livros:", error);
    }
  }, [userId, token, toast]);

  const resetCount = () => {
    if (!userId) return;
    const now = new Date().toISOString();
    localStorage.setItem(`last_book_check_${userId}`, now);
    setUnreadCount(0);
  };

  useEffect(() => {
    if (userId) {
      checkNewBooks();
      
      // Verificar periodicamente a cada 5 minutos
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
