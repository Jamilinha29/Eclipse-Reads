// Endpoints dos serviços backend.
// Os serviços em `services/backend/*` rodam em portas diferentes (ex: 4000 e 4200) e
// não utilizam prefixo `/api`.
const BOOKS_API_BASE_URL =
  (import.meta.env.VITE_BOOKS_API_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  "/api/books";

const LIBRARY_API_BASE_URL =
  (import.meta.env.VITE_LIBRARY_API_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  "/api/library";

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

  async getQuoteOfDay(options?: { rotate?: boolean }) {
    const q =
      options?.rotate === false
        ? ""
        : "?rotate=1";
    const response = await fetch(`${BOOKS_API_BASE_URL}/quotes/today${q}`);
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

  async uploadProfileMedia(kind: "avatar" | "banner", file: File, token: string) {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/profile-media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
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
    payload: { 
      theme?: "light" | "dark"; 
      sound_enabled?: boolean; 
      notifications_enabled?: boolean;
      new_books_notifications?: boolean;
    },
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

  // ACHIEVEMENTS
  async getAchievements() {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/achievements`);
    const data = await handleResponse(response);
    return data;
  },

  async toggleAchievement(id: string, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/achievements/${id}/toggle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async adminCreateAchievement(payload: { title: string; description?: string }, token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/admin/achievements`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // STATS
  async getMeStats(token: string) {
    const response = await fetch(`${LIBRARY_API_BASE_URL}/me/stats`, {
      headers: { Authorization: `Bearer ${token}` },
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

  // Admin (books-api) — Bearer + role admin
  async adminGetSubmissions(token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/submissions`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async adminApproveSubmission(id: string, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/submissions/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async adminRejectSubmission(id: string, rejection_reason: string, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/submissions/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason }),
    });
    return handleResponse(response);
  },

  async adminListBooksStorage(token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/storage/books`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  async adminDownloadStorageFile(storagePath: string, downloadFileName: string, token: string) {
    const url = `${BOOKS_API_BASE_URL}/admin/storage/books/download?path=${encodeURIComponent(storagePath)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || `Erro ${response.status}`);
    }
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  async adminUploadCover(file: File, basename: string, token: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("basename", basename);
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/storage/books/cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return handleResponse(response);
  },

  async adminUpdateBook(id: string, payload: Record<string, unknown>, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/books/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async adminImportBook(payload: Record<string, unknown>, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/books/import`, {
      method: "POST",
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
