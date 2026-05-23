import { supabase } from "@/integrations/supabase/client";

type LibraryTab = "favoritos" | "lendo" | "lidos";

const LIBRARY_TABLE: Record<LibraryTab, "favorites" | "reading" | "read"> = {
  favoritos: "favorites",
  lendo: "reading",
  lidos: "read",
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return data.user.id;
}

export async function fetchMeProfile() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (data) return { profile: data };

  const { data: created, error: createErr } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, username: "Usuário" }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (createErr) throw new Error(createErr.message);
  return { profile: created ?? null };
}

export async function fetchMeSettings() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (data) return { settings: data };

  const defaults = {
    user_id: userId,
    theme: "dark" as const,
    sound_enabled: true,
    notifications_enabled: true,
    new_books_notifications: true,
  };
  const { data: created, error: createErr } = await supabase
    .from("user_settings")
    .upsert(defaults, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (createErr) throw new Error(createErr.message);
  return { settings: created ?? null };
}

export async function upsertMeProfile(payload: {
  username?: string;
  avatar_image?: string;
  banner_image?: string;
}) {
  const userId = await requireUserId();
  const row: Record<string, unknown> = { user_id: userId };
  if (payload.username !== undefined) row.username = payload.username;
  if (payload.avatar_image !== undefined) row.avatar_image = payload.avatar_image;
  if (payload.banner_image !== undefined) row.banner_image = payload.banner_image;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { profile: data ?? null };
}

const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProfileMediaToStorage(kind: "avatar" | "banner", file: File) {
  const userId = await requireUserId();
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um ficheiro de imagem.");
  }
  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    throw new Error("Imagem demasiado grande (máx. 5 MB).");
  }

  const objectPath = `${userId}/${kind}`;

  const { data: existingProfile, error: loadErr } = await supabase
    .from("profiles")
    .select("username, avatar_image, banner_image")
    .eq("user_id", userId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);

  const { error: upErr } = await supabase.storage.from("avatars").upload(objectPath, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "0",
  });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const upsertRow: Record<string, unknown> = {
    user_id: userId,
    username: existingProfile?.username ?? "Usuário",
    avatar_image: kind === "avatar" ? publicUrl : existingProfile?.avatar_image ?? null,
    banner_image: kind === "banner" ? publicUrl : existingProfile?.banner_image ?? null,
  };

  const { data: profile, error: saveErr } = await supabase
    .from("profiles")
    .upsert(upsertRow, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (saveErr) throw new Error(saveErr.message);

  return { publicUrl, profile };
}

export async function upsertMeSettings(payload: {
  theme?: "light" | "dark";
  sound_enabled?: boolean;
  notifications_enabled?: boolean;
  new_books_notifications?: boolean;
}) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { settings: data ?? null };
}

export async function fetchGoals() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reading_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { goals: data ?? [] };
}

export async function createGoal(payload: {
  title: string;
  target_books: number;
  deadline: string | null;
}) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reading_goals")
    .insert({
      user_id: userId,
      title: payload.title,
      target_books: payload.target_books,
      deadline: payload.deadline,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { goal: data };
}

export async function updateGoal(
  id: string,
  payload: { current_books?: number; completed?: boolean }
) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reading_goals")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { goal: data ?? null };
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  const { error } = await supabase.from("reading_goals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function fetchAchievements() {
  const { data, error } = await supabase
    .from("achievements" as "profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { achievements: data ?? [] };
}

export async function fetchMeAchievements() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_achievements" as "favorites")
    .select("achievement_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { achievementIds: (data ?? []).map((row: { achievement_id: string }) => row.achievement_id) };
}

export async function toggleAchievement(id: string) {
  const userId = await requireUserId();
  const { data: existing, error: findErr } = await supabase
    .from("user_achievements" as "favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", id)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await supabase
      .from("user_achievements" as "favorites")
      .delete()
      .eq("user_id", userId)
      .eq("achievement_id", id);
    if (error) throw new Error(error.message);
    return { achieved: false };
  }

  const { error } = await supabase
    .from("user_achievements" as "favorites")
    .insert({ user_id: userId, achievement_id: id });
  if (error) throw new Error(error.message);
  return { achieved: true };
}

export async function fetchMeStats() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("current_page")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const totalPagesRead = (data ?? []).reduce(
    (acc, row) => acc + (Number(row.current_page) || 0),
    0
  );
  return { totalPagesRead };
}

export async function fetchLibrary(type: LibraryTab) {
  const userId = await requireUserId();
  const table = LIBRARY_TABLE[type];

  const { data: links, error: linksErr } = await supabase
    .from(table)
    .select("book_id")
    .eq("user_id", userId);
  if (linksErr) throw new Error(linksErr.message);

  const ids = (links ?? []).map((r) => r.book_id).filter(Boolean);
  if (ids.length === 0) return { books: [] };

  const { data: books, error: booksErr } = await supabase
    .from("books")
    .select("id, title, author, category, cover_image, rating, age_rating, created_at, file_path")
    .in("id", ids);
  if (booksErr) throw new Error(booksErr.message);
  return { books: books ?? [] };
}

export async function addToLibrary(type: LibraryTab, bookId: string) {
  const userId = await requireUserId();
  const table = LIBRARY_TABLE[type];

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from(table).insert({ user_id: userId, book_id: bookId });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function removeFromLibrary(type: LibraryTab, bookId: string) {
  const userId = await requireUserId();
  const table = LIBRARY_TABLE[type];
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function fetchReadingProgress(bookId: string) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { progress: data ?? null };
}

export async function saveReadingProgress(
  bookId: string,
  payload: { current_page: number; total_pages: number; progress_percentage: number }
) {
  const userId = await requireUserId();
  const total_pages = Math.max(1, Math.min(10000, payload.total_pages));
  const current_page = Math.max(1, Math.min(total_pages, payload.current_page));
  const progress_percentage = Math.max(
    0,
    Math.min(100, payload.progress_percentage || (current_page / total_pages) * 100)
  );

  const { data, error } = await supabase
    .from("reading_progress")
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        current_page,
        total_pages,
        progress_percentage,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" }
    )
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { progress: data ?? null };
}
