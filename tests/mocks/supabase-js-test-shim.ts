/**
 * Substitui @supabase/supabase-js nos testes. Sem dependência do Vitest aqui
 * (evita cópias duplicadas do módulo quando o Vite empacota os serviços).
 */
type CreateFn = (...args: unknown[]) => unknown;

const key = "__ECLIPSE_READS_SUPABASE_CREATE_CLIENT__" as const;

export function createClient(...args: unknown[]) {
  const fn = (globalThis as unknown as Record<string, CreateFn | undefined>)[key];
  if (typeof fn !== "function") {
    throw new Error("Test setup: register globalThis." + key + " in tests/setup.ts");
  }
  return fn(...args);
}
