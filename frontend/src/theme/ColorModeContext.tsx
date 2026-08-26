import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ColorMode = "dark" | "light";

const STORAGE_KEY = "es_theme";

type ColorModeContextValue = {
  mode: ColorMode;
  toggle: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function readStored(): ColorMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyDom(mode: ColorMode) {
  document.documentElement.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "light" ? "#f3f5f8" : "#0e0c0b");
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(() =>
    typeof document === "undefined" ? "dark" : readStored()
  );

  useEffect(() => {
    applyDom(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      toggle: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error("useColorMode precisa do ColorModeProvider");
  return ctx;
}
