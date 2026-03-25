// Endpoints dos serviços backend.
// Os serviços em `services/backend/*` rodam em portas diferentes (ex: 4000 e 4200) e
// não utilizam prefixo `/api`.
const BOOKS_API_BASE_URL =
  (import.meta.env.VITE_BOOKS_API_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  "http://localhost:4000";

const LIBRARY_API_BASE_URL =
  (import.meta.env.VITE_LIBRARY_API_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  "http://localhost:4200";

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Books endpoints
  async getBooks() {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books`);
    return handleResponse(response);
  },

  async getBook(id: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}`);
    return handleResponse(response);
  },

  getBookFileUrl(id: string) {
    return `${BOOKS_API_BASE_URL}/books/${id}/file`;
  },

  async getQuoteOfDay() {
    const response = await fetch(`${BOOKS_API_BASE_URL}/quotes/today`);
    return handleResponse(response);
  },

  async createBook(book: Record<string, any>) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    return handleResponse(response);
  },

  async updateBook(id: string, book: Record<string, any>) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    return handleResponse(response);
  },

  async deleteBook(id: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Library endpoints - com autenticação
  async getLibrary(type: 'favoritos' | 'lendo' | 'lidos', token: string) {
    const response = await fetch(
      `${LIBRARY_API_BASE_URL}/library?type=${type}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  async addToLibrary(type: 'favoritos' | 'lendo' | 'lidos', bookId: string, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/library/${type}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ book_id: bookId }),
    });
    return handleResponse(response);
  },

  async removeFromLibrary(type: 'favoritos' | 'lendo' | 'lidos', bookId: string, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/library/${type}/${bookId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },
};
