import { beforeEach } from "vitest";
import { supabaseCreateClientMock } from "./mocks/supabaseRegistry";

const key = "__ECLIPSE_READS_SUPABASE_CREATE_CLIENT__" as const;

(globalThis as unknown as Record<string, (...args: unknown[]) => unknown>)[key] = (...args: unknown[]) =>
  supabaseCreateClientMock(...args);

beforeEach(() => {
  supabaseCreateClientMock.mockReset();
});
