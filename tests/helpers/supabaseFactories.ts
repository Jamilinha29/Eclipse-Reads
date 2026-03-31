import { vi } from "vitest";

type SupabaseResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

export type BooksMockConfig = {
  listResult?: () => SupabaseResult;
  singleResult?: () => SupabaseResult;
  insertResult?: () => SupabaseResult;
};

export type LibraryServiceConfig = {
  relationshipResult?: () => SupabaseResult<Array<{ book_id: string }>>;
  booksResult?: () => SupabaseResult<Array<Record<string, unknown>>>;
};

export const authenticatedUser = { user: { id: "tester" } };

export const createAuthClient = (resolver: () => SupabaseResult<{ user: Record<string, unknown> | null }>) => ({
  auth: {
    getUser: vi.fn().mockImplementation(resolver),
  },
});

export const createBaseClient = () => ({
  auth: {
    getUser: vi.fn(),
  },
});

export const createBooksSupabaseMock = (config: BooksMockConfig = {}) => {
  const listResult = config.listResult ?? (() => Promise.resolve({ data: [], error: null }));
  const singleResult = config.singleResult ?? (() => Promise.resolve({ data: { id: "1" }, error: null }));
  const insertResult = config.insertResult ?? (() => Promise.resolve({ data: { id: "generated" }, error: null }));

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
    upload: vi.fn(() => Promise.resolve({ error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://test" } })),
    remove: vi.fn(() => Promise.resolve({ error: null })),
  }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "books") {
        throw new Error(`Unexpected table ${table}`);
      }

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
    }),
    storage: {
      from: storageFrom,
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

