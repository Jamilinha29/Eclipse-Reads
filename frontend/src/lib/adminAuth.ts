import { supabase } from "@/integrations/supabase/client";

/** Lê `public.user_roles` no mesmo projeto Supabase da sessão (RLS: usuário vê só o próprio papel). */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (!rpcError && typeof rpcData === "boolean") {
    return rpcData;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("checkIsAdmin:", error.message);
    return false;
  }

  return (data ?? []).some((row) => row.role === "admin");
}
