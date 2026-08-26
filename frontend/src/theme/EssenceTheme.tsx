import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo, type ReactNode } from "react";
import { useColorMode } from "./ColorModeContext";
import { createEssenceTheme } from "./createEssenceTheme";

export function EssenceTheme({ children }: { children: ReactNode }) {
  const { mode } = useColorMode();
  const theme = useMemo(() => createEssenceTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
