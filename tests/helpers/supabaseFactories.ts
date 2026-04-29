import { vi } from "vitest";

type SupabaseResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

export type BooksMockConfig = {
  listResult?: () => SupabaseResult;
  singleResult?: () => SupabaseResult;
  insertResult?: () => SupabaseResult;
  /** POST /submissions → insert em `book_submissions` (select → maybeSingle). */
  submissionInsertResult?: () => SupabaseResult;
  /** Retorno de `storage.from("books").upload` (apenas campo `error`). */
  storageUploadResult?: () => Promise<{ error: { message: string } | null }>;
};

export type LibraryServiceConfig = {
  relationshipResult?: () => SupabaseResult<Array<{ book_id: string }>>;
  booksResult?: () => SupabaseResult<Array<Record<string, unknown>>>;
};

export const authenticatedUser = { user: { id: "tester", email: "tester@example.com" } };

export const createAuthClient = (resolver: () => SupabaseResult<{ user: Record<string, unknown> | null }>) => ({
  auth: {
    getUser: vi.fn().mockImplementation(resolver),
  },
});

export const createBaseClient = () => ({
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
        },
        user: { id: "u-login", email: "login@example.com" },
      },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: {
        session: null,
        user: { id: "u-signup", email: "signup@example.com" },
      },
      error: null,
    }),
  },
});

export const createBooksSupabaseMock = (config: BooksMockConfig = {}) => {
  const listResult = config.listResult ?? (() => Promise.resolve({ data: [], error: null }));
  const singleResult = config.singleResult ?? (() => Promise.resolve({ data: { id: "1" }, error: null }));
  const insertResult = config.insertResult ?? (() => Promise.resolve({ data: { id: "generated" }, error: null }));
  const submissionInsertResult =
    config.submissionInsertResult ??
    (() =>
      Promise.resolve({
        data: {
          id: "sub-1",
          user_id: "user-1",
          status: "pending",
          file_path: "user-1/file.pdf",
          file_type: "pdf",
        },
        error: null,
      }));
  const storageUploadResult = config.storageUploadResult ?? (() => Promise.resolve({ error: null }));

  const createSelectBuilder = () => {
    const builder: {
      order: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      then: typeof Promise.prototype.then;
      catch: typeof Promise.prototype.catch;
    } = {
      order: vi.fn(() => builder),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => singleResult()),
        })),
        maybeSingle: vi.fn(() => singleResult()),
      })),
      then: ((onFulfilled, onRejected) =>
        Promise.resolve(listResult()).then(onFulfilled as never, onRejected)) as typeof Promise.prototype.then,
      catch: ((onRejected) => Promise.resolve(listResult()).catch(onRejected)) as typeof Promise.prototype.catch,
    };
    return builder;
  };

  const storageFrom = vi.fn(() => ({
    list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    download: vi.fn(() => Promise.resolve({ data: null, error: { message: "no file" } })),
    upload: vi.fn().mockImplementation(() => storageUploadResult()),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://test" } })),
    remove: vi.fn(() => Promise.resolve({ error: null })),
  }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "book_submissions") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(() => submissionInsertResult()),
            }),
          }),
        };
      }

      if (table === "books") {
        return {
          select: vi.fn().mockImplementation(() => createSelectBuilder()),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => insertResult()),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation(() => singleResult()),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    storage: {
      from: storageFrom,
    },
  };
};

export type LibraryProfileMockConfig = {
  profileSelectResult?: () => SupabaseResult<Record<string, unknown>>;
  profileUpsertResult?: () => SupabaseResult<Record<string, unknown>>;
  storageUploadResult?: () => Promise<{ error: { message: string } | null }>;
};

/** Cliente service com `profiles` + storage `avatars` (rotas /me/profile e /me/profile-media). */
export const createLibraryProfileSupabaseMock = (config: LibraryProfileMockConfig = {}) => {
  const defaultProfile = {
    username: "Test User",
    avatar_image: null as string | null,
    banner_image: null as string | null,
    user_id: "tester",
  };
  const profileSelectResult =
    config.profileSelectResult ?? (() => Promise.resolve({ data: defaultProfile, error: null }));
  const profileUpsertResult =
    config.profileUpsertResult ??
    (() =>
      Promise.resolve({
        data: { ...defaultProfile, avatar_image: "https://x/object/public/avatars/tester/avatar" },
        error: null,
      }));
  const storageUploadResult = config.storageUploadResult ?? (() => Promise.resolve({ error: null }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: vi.fn().mockImplementation((_cols?: string) => ({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => profileSelectResult()),
          }),
        })),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => profileUpsertResult()),
          }),
        }),
      };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockImplementation(() => storageUploadResult()),
        remove: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/avatars/tester/avatar" },
        })),
      })),
    },
  };
};

export const createAuthClientMock = (resolver: () => SupabaseResult<{ user: { id: string } }>) => ({
  auth: {
    getUser: vi.fn().mockImplementation(() => resolver()),
  },
});

export const createLibraryServiceClient = (config: LibraryServiceConfig = {}) => {
  const relationshipResult =
    config.relationshipResult ?? (() => Promise.resolve({ data: [{ book_id: "1" }], error: null }));
  const booksResult = config.booksResult ?? (() => Promise.resolve({ data: [{ id: "1" }], error: null }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "favorites" || table === "reading" || table === "read") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => relationshipResult()),
          }),
        };
      }

      if (table === "books") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(() => booksResult()),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
};

