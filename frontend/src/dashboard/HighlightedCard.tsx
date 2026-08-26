import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

export function HighlightedCard() {
  const navigate = useNavigate();
  const light = useTheme().palette.mode === "light";

  return (
    <Card
      sx={{
        height: "100%",
        background: light
          ? "linear-gradient(180deg, rgba(30,58,95,0.08), #ffffff 55%)"
          : "linear-gradient(180deg, rgba(196,165,116,0.18), rgba(22,18,16,0.9))",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ color: "primary.main" }} />
        <div>
          <Typography component="h2" variant="subtitle2" gutterBottom>
            Registrar venda
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Abra o PDV, passe o código e finalize com F2.
          </Typography>
        </div>
        <Button
          variant="contained"
          endIcon={<ChevronRightRoundedIcon />}
          onClick={() => navigate("/vendas")}
        >
          Ir para vendas
        </Button>
      </CardContent>
    </Card>
  );
}
