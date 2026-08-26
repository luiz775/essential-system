import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import { PieChart } from "@mui/x-charts/PieChart";
import { formatMoney, type Painel } from "../lib/api";

export function OrigemPagamentos({ mes }: { mes: Painel["mes"] }) {
  const total = mes.faturamento || 1;
  const pie = [
    { id: 0, value: mes.pagamentos.dinheiro, label: "Dinheiro" },
    { id: 1, value: mes.pagamentos.pix, label: "PIX" },
    { id: 2, value: mes.pagamentos.debito, label: "Débito" },
    { id: 3, value: mes.pagamentos.credito, label: "Crédito" },
    { id: 4, value: mes.pagamentos.fiado ?? 0, label: "A receber" },
  ].filter((slice) => slice.value > 0);

  const rows = [
    { label: "Física", value: mes.fisica },
    { label: "Online", value: mes.online },
  ];

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          Origem e pagamentos
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <PieChart
            height={180}
            series={[
              {
                innerRadius: 45,
                outerRadius: 75,
                paddingAngle: 2,
                cornerRadius: 4,
                data: pie.length ? pie : [{ id: 0, value: 1, label: "Sem vendas" }],
              },
            ]}
            hideLegend={false}
          />
        </Box>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {rows.map((row) => (
            <Box key={row.label}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2">{row.label}</Typography>
                <Typography variant="body2" color="primary">
                  {formatMoney(row.value)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (row.value / total) * 100)}
                sx={{ mt: 0.5, height: 8, borderRadius: 99 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
