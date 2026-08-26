import { useState } from "react";
import { styled } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import MuiToolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { BrandMark } from "../components/BrandMark";
import { AccountBar } from "./AccountBar";
import type { LicencaStatus } from "../lib/api";
import { DRAWER_WIDTH } from "./nav";
import { MenuContent } from "./MenuContent";

const Toolbar = styled(MuiToolbar)({
  width: "100%",
  minHeight: 56,
  paddingTop: "max(8px, env(safe-area-inset-top))",
  paddingLeft: "max(12px, env(safe-area-inset-left))",
  paddingRight: "max(12px, env(safe-area-inset-right))",
  paddingBottom: 8,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexShrink: 0,
});

type Props = {
  licenca: LicencaStatus | null;
};

export function AppNavbar({ licenca }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <AppBar
      position="fixed"
      className="print:hidden"
      sx={{
        display: { xs: "flex", md: "none" },
        boxShadow: 0,
        bgcolor: "background.paper",
        backgroundImage: "none",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
        top: 0,
      }}
    >
      <Toolbar variant="regular">
        <IconButton
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          color="inherit"
          edge="start"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <MenuRoundedIcon />
        </IconButton>
        <Stack direction="row" spacing={1} sx={{ flexGrow: 1, alignItems: "center", minWidth: 0 }}>
          <BrandMark size={32} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.05, mb: 0 }} noWrap>
              Essential System
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "primary.main",
                fontSize: "0.65rem",
                letterSpacing: "0.04em",
                lineHeight: 1,
                display: "block",
                mt: 0.15,
              }}
              noWrap
            >
              By Luiz Gustavo
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(86vw, 300px)", sm: DRAWER_WIDTH },
              backgroundImage: "none",
              backgroundColor: "background.paper",
              pt: "env(safe-area-inset-top)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <BrandMark size={36} />
          <Box>
            <Typography variant="h6">Menu</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {licenca?.lojaNome ?? "Essential System"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <MenuContent onNavigate={() => setOpen(false)} />
        </Box>
        <AccountBar licenca={licenca} />
      </Drawer>
    </AppBar>
  );
}
