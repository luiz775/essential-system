import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { BarChart } from "@mui/x-charts/BarChart";
import { formatMoney } from "../lib/api";

type Point = { label: string; lucro: number; faturamento: number };

export function LucroBarChart({ series }: { series: Point[] }) {
  const theme = useTheme();
  const total = series.reduce((sum, row) => sum + row.lucro, 0);

  return (
    <Card variant="outlined" sx={{ width: "100%" }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          Lucro
        </Typography>
        <Stack sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4">{formatMoney(total)}</Typography>
            <Chip size="small" color="primary" label="6 meses" />
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Venda menos o custo dos perfumes
          </Typography>
        </Stack>
        <BarChart
          borderRadius={8}
          colors={[theme.palette.primary.main]}
          xAxis={[{ scaleType: "band", data: series.map((row) => row.label) }]}
          yAxis={[{ width: 50 }]}
          series={[{ id: "lucro", label: "Lucro", data: series.map((row) => row.lucro) }]}
          height={250}
          margin={{ left: 0, right: 12, top: 20, bottom: 0 }}
          grid={{ horizontal: true }}
          hideLegend
        />
      </CardContent>
    </Card>
  );
}
