import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { obterLicenca, type LicencaStatus } from "../lib/api";
import { Atmosphere } from "./Atmosphere";
import { LicenseLock } from "./LicenseLock";
import { LicenseBanner } from "./Recibo";
import { AppNavbar } from "../dashboard/AppNavbar";
import { SideMenu } from "../dashboard/SideMenu";

export function Layout() {
  const [licenca, setLicenca] = useState<LicencaStatus | null>(null);
  const location = useLocation();

  useEffect(() => {
    obterLicenca().then(setLicenca).catch(() => undefined);
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Atmosphere />
      <SideMenu licenca={licenca} />
      <AppNavbar licenca={licenca} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          backgroundColor: "transparent",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Stack
          spacing={2}
          className="page-enter"
          sx={{
            position: "relative",
            zIndex: 1,
            alignItems: "stretch",
            mx: 0,
            pb: { xs: 4, md: 5 },
            mt: { xs: "calc(64px + env(safe-area-inset-top, 0px))", md: 0 },
            px: { xs: 1.5, sm: 2, md: 3 },
            pt: { xs: 1.5, md: 3 },
            "@media print": {
              mt: 0,
              px: 0,
              pt: 0,
              pb: 0,
            },
          }}
          key={location.pathname}
        >
          {licenca && !licenca.bloqueada && <LicenseBanner licenca={licenca} />}
          {licenca?.bloqueada && location.pathname !== "/mensalidade" ? (
            <LicenseLock licenca={licenca} />
          ) : (
            <Outlet />
          )}
        </Stack>
      </Box>
    </Box>
  );
}
