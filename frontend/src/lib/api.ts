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

  async createSubmission(
    payload: {
      title: string;
      author: string;
      description: string;
      category: string;
      file: File;
    },
    token: string
  ) {
    const form = new FormData();
    form.append("title", payload.title);
    form.append("author", payload.author);
    form.append("description", payload.description);
    form.append("category", payload.category);
    form.append("file", payload.file);

    const response = await fetch(`${BOOKS_API_BASE_URL}/submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    return handleResponse(response);
  },

  async getMySubmissions(token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/submissions/mine`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return handleResponse(response);
  },

  async deleteMySubmission(id: string, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/submissions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return handleResponse(response);
  },

  // Me endpoints - profile/settings/admin/goals
  async getMeAdmin(token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/admin`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async getMeProfile(token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/profile`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async updateMeProfile(
    payload: { username?: string; avatar_image?: string; banner_image?: string },
    token: string
  ) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/profile`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async getMeSettings(token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/settings`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async updateMeSettings(
    payload: { theme?: "light" | "dark"; sound_enabled?: boolean; notifications_enabled?: boolean },
    token: string
  ) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/settings`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async getGoals(token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/goals`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async createGoal(
    payload: { title: string; target_books: number; deadline: string | null },
    token: string
  ) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/goals`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async updateGoal(
    id: string,
    payload: { current_books?: number; completed?: boolean },
    token: string
  ) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/goals/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async deleteGoal(id: string, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async getReadingProgress(bookId: string, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/reading-progress/${bookId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async saveReadingProgress(
    bookId: string,
    payload: { current_page: number; total_pages: number; progress_percentage: number },
    token: string
  ) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/reading-progress/${bookId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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
