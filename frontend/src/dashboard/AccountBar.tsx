import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../auth/AuthContext";
import type { LicencaStatus } from "../lib/api";
import { useColorMode } from "../theme/ColorModeContext";

type Props = {
  licenca: LicencaStatus | null;
  compact?: boolean;
};

export function AccountBar({ licenca, compact = false }: Props) {
  const { operador, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const nome = operador?.nome ?? licenca?.lojaNome ?? "Essential System";
  const themeLabel = mode === "dark" ? "Tema claro" : "Tema escuro";

  return (
    <Stack
      sx={{
        p: compact ? 1 : 2,
        gap: compact ? 0.75 : 0,
        alignItems: compact ? "center" : "stretch",
        borderTop: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        sx={{
          gap: compact ? 0 : 0.75,
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: 14,
          }}
        >
          {nome.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            mr: "auto",
            opacity: compact ? 0 : 1,
            width: compact ? 0 : "auto",
            overflow: "hidden",
            transition: "opacity 0.2s ease",
            pointerEvents: compact ? "none" : "auto",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            {nome}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
            {operador?.usuario ?? "Operador"}
          </Typography>
        </Box>
        {!compact ? (
          <>
            <Tooltip title={themeLabel} placement="top">
              <IconButton
                aria-label={themeLabel}
                size="small"
                onClick={toggle}
                sx={{ color: "text.secondary", flexShrink: 0 }}
              >
                {mode === "dark" ? (
                  <LightModeRoundedIcon fontSize="small" />
                ) : (
                  <DarkModeRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Sair" placement="top">
              <IconButton
                aria-label="Sair"
                size="small"
                onClick={() => logout()}
                sx={{ color: "text.secondary", flexShrink: 0 }}
              >
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Stack>
      {compact ? (
        <Stack direction="row" sx={{ gap: 0.25 }}>
          <Tooltip title={themeLabel} placement="right">
            <IconButton aria-label={themeLabel} size="small" onClick={toggle} sx={{ color: "text.secondary" }}>
              {mode === "dark" ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sair" placement="right">
            <IconButton aria-label="Sair" size="small" onClick={() => logout()} sx={{ color: "text.secondary" }}>
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </Stack>
  );
}
