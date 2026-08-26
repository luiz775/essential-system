import { useState } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BrandMark } from "../components/BrandMark";
import { AccountBar } from "./AccountBar";
import type { LicencaStatus } from "../lib/api";
import { DRAWER_COLLAPSED_WIDTH, DRAWER_WIDTH } from "./nav";
import { MenuContent } from "./MenuContent";

const Drawer = styled(MuiDrawer)(({ theme }) => ({
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  [`& .${drawerClasses.paper}`]: {
    boxSizing: "border-box",
    overflowX: "hidden",
    backgroundImage: "none",
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter,
    }),
  },
}));

type Props = {
  licenca: LicencaStatus | null;
};

export function SideMenu({ licenca }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Drawer
      variant="permanent"
      className="print:hidden"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      sx={{
        display: { xs: "none", md: "block" },
        width: expanded ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        [`& .${drawerClasses.paper}`]: {
          width: expanded ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
          position: "relative",
          backgroundColor: "background.paper",
          boxShadow: "none",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          mt: "calc(var(--template-frame-height, 0px) + 8px)",
          px: expanded ? 1.5 : 0,
          py: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={expanded ? 1.5 : 0}
          sx={{
            alignItems: "center",
            overflow: "hidden",
            width: expanded ? "100%" : 40,
            justifyContent: "center",
          }}
        >
          <BrandMark size={40} />
          <Box
            sx={{
              minWidth: 0,
              opacity: expanded ? 1 : 0,
              width: expanded ? "auto" : 0,
              overflow: "hidden",
              transition: "opacity 0.2s ease",
              pointerEvents: expanded ? "auto" : "none",
            }}
          >
            <Typography variant="h6" sx={{ lineHeight: 1.05, mb: 0 }} noWrap>
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
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent compact={!expanded} />
      </Box>
      <AccountBar licenca={licenca} compact={!expanded} />
    </Drawer>
  );
}
