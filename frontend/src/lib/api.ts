// Endpoints dos serviços backend (bases em `apiBases.ts` — env na Vercel, /api/* só em dev).
import { BOOKS_API_BASE_URL, LIBRARY_API_BASE_URL, PRODUCTION_API_CONFIG_MESSAGE } from "@/lib/apiBases";
import { checkIsAdmin } from "@/lib/adminAuth";
import { listLivrosBookFilesFromStorage } from "@/lib/storageBooks";
import {
  addToLibrary as supabaseAddToLibrary,
  createGoal as supabaseCreateGoal,
  deleteGoal as supabaseDeleteGoal,
  fetchAchievements,
  fetchGoals,
  fetchLibrary,
  fetchMeAchievements,
  fetchMeProfile,
  fetchMeSettings,
  fetchMeStats,
  fetchReadingProgress,
  removeFromLibrary as supabaseRemoveFromLibrary,
  saveReadingProgress as supabaseSaveReadingProgress,
  toggleAchievement as supabaseToggleAchievement,
  updateGoal as supabaseUpdateGoal,
  upsertMeProfile,
  upsertMeSettings,
  uploadProfileMediaToStorage,
} from "@/lib/supabaseLibrary";

const assertBooksApi = () => {
  if (!BOOKS_API_BASE_URL) {
    throw new Error(PRODUCTION_API_CONFIG_MESSAGE);
  }
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    if (response.status === 401) {
      throw new Error(error.error || "Sessão expirada. Faça login novamente.");
    }
    if (response.status === 403) {
      throw new Error(error.error || "Você não tem permissão para esta ação.");
    }
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Books endpoints
  async getBooks() {
    assertBooksApi();
    const response = await fetch(`${BOOKS_API_BASE_URL}/books`);
    return handleResponse(response);
  },

  async getBook(id: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}`);
    return handleResponse(response);
  },

  getBookFileUrl(id: string, access?: string) {
    const base = `${BOOKS_API_BASE_URL}/books/${id}/file`;
    return access ? `${base}?access=${encodeURIComponent(access)}` : base;
  },

  async getBookFileAccess(id: string, token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}/file-access`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response) as Promise<{ url: string; access: string; expiresIn: number }>;
  },

  /** D-02: token no header, blob URL local (sem vazar em query/histórico). */
  async fetchBookFileBlob(id: string, access: string): Promise<string> {
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${id}/file`, {
      headers: { "X-File-Access": access },
    });
    if (!response.ok) {
      throw new Error("Falha ao carregar arquivo do livro");
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
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
  async getMeAdmin(userId: string) {
    const isAdmin = await checkIsAdmin(userId);
    return { isAdmin };
  },

  async getMeProfile(_token: string) {
    return fetchMeProfile();
  },

  async updateMeProfile(
    payload: { username?: string; avatar_image?: string; banner_image?: string },
    _token: string
  ) {
    return upsertMeProfile(payload);
  },

  async uploadProfileMedia(kind: "avatar" | "banner", file: File, _token: string) {
    return uploadProfileMediaToStorage(kind, file);
  },

  async getMeSettings(_token: string) {
    return fetchMeSettings();
  },

  async updateMeSettings(
    payload: { 
      theme?: "light" | "dark"; 
      sound_enabled?: boolean; 
      notifications_enabled?: boolean;
      new_books_notifications?: boolean;
    },
    _token: string
  ) {
    return upsertMeSettings(payload);
  },

  async getGoals(_token: string) {
    return fetchGoals();
  },

  // ACHIEVEMENTS
  async getAchievements() {
    return fetchAchievements();
  },

  async toggleAchievement(id: string, _token: string) {
    return supabaseToggleAchievement(id);
  },

  async getMeAchievements(_token: string) {
    return fetchMeAchievements();
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
  async getMeStats(_token: string) {
    return fetchMeStats();
  },

  async createGoal(
    payload: { title: string; target_books: number; deadline: string | null },
    _token: string
  ) {
    return supabaseCreateGoal(payload);
  },

  async updateGoal(
    id: string,
    payload: { current_books?: number; completed?: boolean },
    _token: string
  ) {
    return supabaseUpdateGoal(id, payload);
  },

  async deleteGoal(id: string, _token: string) {
    return supabaseDeleteGoal(id);
  },

  async getReadingProgress(bookId: string, _token: string) {
    return fetchReadingProgress(bookId);
  },

  async saveReadingProgress(
    bookId: string,
    payload: { current_page: number; total_pages: number; progress_percentage: number },
    _token: string
  ) {
    return supabaseSaveReadingProgress(bookId, payload);
  },

  // Admin (books-api) — Bearer + role admin
  async adminGetBooks(token: string) {
    const response = await fetch(`${BOOKS_API_BASE_URL}/admin/books`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

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

  async adminListBooksStorage(_token: string) {
    const files = await listLivrosBookFilesFromStorage();
    return { files };
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

  // Library — Supabase direto (RLS); não depende do library-service local
  async getLibrary(type: "favoritos" | "lendo" | "lidos", _token: string) {
    return fetchLibrary(type);
  },

  async addToLibrary(type: "favoritos" | "lendo" | "lidos", bookId: string, _token: string) {
    return supabaseAddToLibrary(type, bookId);
  },

  async removeFromLibrary(type: "favoritos" | "lendo" | "lidos", bookId: string, _token: string) {
    return supabaseRemoveFromLibrary(type, bookId);
  },

  async getBookReviews(bookId: string) {
    assertBooksApi();
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${bookId}/reviews`);
    return handleResponse(response);
  },

  async upsertBookReview(
    bookId: string,
    payload: { rating: number; comment: string | null },
    token: string
  ) {
    assertBooksApi();
    const response = await fetch(`${BOOKS_API_BASE_URL}/books/${bookId}/reviews`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
};
