import { vi } from "vitest";

/** Configurado em setup.ts em globalThis para o shim usado pelos serviços. */
export const supabaseCreateClientMock = vi.fn();
