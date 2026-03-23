export const THEME_STORAGE_KEY = "eclipse_reads_ui_theme";

export function getStoredTheme(): "light" | "dark" | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return null;
}
