const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

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
    const response = await fetch(`${API_BASE_URL}/api/books`);
    return handleResponse(response);
  },

  async getBook(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/books?id=${id}`);
    return handleResponse(response);
  },

  async createBook(book: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    return handleResponse(response);
  },

  async updateBook(id: string, book: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    return handleResponse(response);
  },

  async deleteBook(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/books/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Library endpoints - com autenticação
  async getLibrary(type: 'favoritos' | 'lendo' | 'lidos', token: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/library?type=${type}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },
};
