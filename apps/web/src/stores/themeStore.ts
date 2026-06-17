import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", next === "light");
      localStorage.setItem("al-theme", next);
    }
  },
  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", t === "light");
    }
  },
}));
