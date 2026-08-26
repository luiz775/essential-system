import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import { formatMoney, type Painel } from "../lib/api";

export function TopProdutosCard({ produtos }: { produtos: Painel["topProdutos"] }) {
  const max = Math.max(1, ...produtos.map((p) => p.faturamento));

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          Top perfumes do mês
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {produtos.map((produto, index) => (
            <Box key={produto.id}>
              <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                <Typography variant="body2">
                  {index + 1}. {produto.nome}
                </Typography>
                <Typography variant="body2" color="primary" sx={{ whiteSpace: "nowrap" }}>
                  {formatMoney(produto.faturamento)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {produto.quantidade} un. · {produto.marca}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(produto.faturamento / max) * 100}
                sx={{ mt: 0.75, height: 8, borderRadius: 99 }}
              />
            </Box>
          ))}
          {produtos.length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Ainda não há vendas neste mês.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
