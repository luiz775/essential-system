import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { LineChart } from "@mui/x-charts/LineChart";
import { formatMoney } from "../lib/api";

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

type Point = { label: string; fisica: number; online: number; faturamento: number };

export function VendasChart({ series }: { series: Point[] }) {
  const theme = useTheme();
  const total = series.reduce((sum, row) => sum + row.faturamento, 0);

  return (
    <Card variant="outlined" sx={{ width: "100%" }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          Vendas
        </Typography>
        <Stack sx={{ justifyContent: "space-between" }}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}
          >
            <Typography variant="h4">{formatMoney(total)}</Typography>
            <Chip size="small" color="success" label="30 dias" />
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Física e online por dia
          </Typography>
        </Stack>
        <LineChart
          colors={[theme.palette.primary.main, theme.palette.secondary.main]}
          xAxis={[{ scaleType: "point", data: series.map((row) => row.label), tickInterval: (_v, i) => i % 5 === 0 }]}
          yAxis={[{ width: 56, valueFormatter: (v: number) => `${Math.round(v)}` }]}
          series={[
            {
              id: "fisica",
              label: "Física",
              showMark: false,
              curve: "linear",
              stack: "total",
              area: true,
              data: series.map((row) => row.fisica),
            },
            {
              id: "online",
              label: "Online",
              showMark: false,
              curve: "linear",
              stack: "total",
              area: true,
              data: series.map((row) => row.online),
            },
          ]}
          height={250}
          margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
          grid={{ horizontal: true }}
          hideLegend={false}
          sx={{
            "& .MuiAreaElement-series-fisica": { fill: "url('#fisica')" },
            "& .MuiAreaElement-series-online": { fill: "url('#online')" },
          }}
        >
          <AreaGradient color={theme.palette.primary.main} id="fisica" />
          <AreaGradient color={theme.palette.secondary.main} id="online" />
        </LineChart>
      </CardContent>
    </Card>
  );
}
