import { vi } from "vitest";

export const loadAuthProxy = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/auth-proxy/src/index");
  return mod.default;
};

export const loadBooksApi = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/books-api/src/index");
  return mod.default;
};

export const loadLibraryService = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/library-service/src/index");
  return mod.default;
};

