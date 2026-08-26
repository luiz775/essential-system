import { createTheme, type Theme } from "@mui/material/styles";
import type { ColorMode } from "./ColorModeContext";

const typography = {
  fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  h4: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 },
  h6: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 },
} as const;

const darkPalette = {
  mode: "dark" as const,
  primary: {
    main: "#c4a574",
    light: "#e8dcc8",
    dark: "#9a7b4f",
    contrastText: "#14110f",
  },
  secondary: {
    main: "#d4b5a0",
  },
  background: {
    default: "#0e0c0b",
    paper: "#161210",
  },
  text: {
    primary: "#f6f1e8",
    secondary: "#e8dcc8",
  },
  divider: "rgba(255,255,255,0.1)",
  success: { main: "#6ee7b7" },
  error: { main: "#fca5a5" },
  warning: { main: "#fcd34d" },
};

const lightPalette = {
  mode: "light" as const,
  primary: {
    main: "#1e3a5f",
    light: "#3d5a82",
    dark: "#152844",
    contrastText: "#f6f1e8",
  },
  secondary: {
    main: "#6d7c8b",
  },
  background: {
    default: "#f3f5f8",
    paper: "#ffffff",
  },
  text: {
    primary: "#1b2430",
    secondary: "#5a6570",
  },
  divider: "rgba(27, 36, 48, 0.12)",
  success: { main: "#0f766e" },
  error: { main: "#b42318" },
  warning: { main: "#b45309" },
};

export function createEssenceTheme(mode: ColorMode): Theme {
  const dark = mode === "dark";

  return createTheme({
    palette: dark ? darkPalette : lightPalette,
    typography,
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: dark ? "#0e0c0b" : "#f3f5f8",
            color: dark ? "#f6f1e8" : "#1b2430",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderColor: dark ? "rgba(196, 165, 116, 0.22)" : "rgba(30, 58, 95, 0.18)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 500 },
          containedPrimary: dark
            ? undefined
            : {
                backgroundColor: "#1e3a5f",
                color: "#f6f1e8",
                "&:hover": { backgroundColor: "#152844" },
              },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: dark
            ? undefined
            : {
                backgroundColor: "#ffffff",
              },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: dark
            ? undefined
            : {
                borderColor: "rgba(31, 25, 20, 0.12)",
                "--DataGrid-rowBorderColor": "rgba(31, 25, 20, 0.08)",
                backgroundColor: "#ffffff",
              },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: dark
            ? undefined
            : {
                border: "1px solid rgba(31, 25, 20, 0.08)",
              },
        },
      },
    },
  });
}
