import { NavLink } from "react-router-dom";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { mainNavItems } from "./nav";

type Props = {
  onNavigate?: () => void;
  compact?: boolean;
};

export function MenuContent({ onNavigate, compact = false }: Props) {
  return (
    <Stack sx={{ flexGrow: 1, p: compact ? 0.75 : 1, justifyContent: "space-between" }}>
      <List
        dense
        disablePadding
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          alignItems: compact ? "center" : "stretch",
        }}
      >
        {mainNavItems.map((item) => {
          const button = (
            <ListItemButton
              component={NavLink}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              sx={{
                borderRadius: compact ? "50%" : 2,
                minHeight: compact ? 44 : 48,
                width: compact ? 44 : "100%",
                minWidth: compact ? 44 : undefined,
                px: compact ? 0 : 2,
                py: 0,
                justifyContent: "center",
                gap: 0,
                touchAction: "manipulation",
                "&.active": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: compact ? 0 : 36,
                  mr: compact ? 0 : 1,
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <item.icon fontSize="small" />
              </ListItemIcon>
              {!compact && (
                <ListItemText
                  primary={item.label}
                  sx={{
                    m: 0,
                    flex: 1,
                    "& .MuiTypography-root": { fontSize: "0.9rem" },
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem
              key={item.to}
              disablePadding
              sx={{
                display: "flex",
                justifyContent: "center",
                width: compact ? 44 : "100%",
              }}
            >
              {compact ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
