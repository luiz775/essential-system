import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";
import { StatCard } from "../dashboard/StatCard";
import { HighlightedCard } from "../dashboard/HighlightedCard";
import { VendasChart } from "../dashboard/VendasChart";
import { LucroBarChart } from "../dashboard/LucroBarChart";
import { OrigemPagamentos } from "../dashboard/OrigemPagamentos";
import { TopProdutosCard } from "../dashboard/TopProdutosCard";
import { VendasDataGrid } from "../dashboard/VendasDataGrid";
import { formatMoney, obterPainel, type Painel } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

function greeting(nome?: string | null) {
  const hour = new Date().getHours();
  const saudacao = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? `${saudacao}, ${primeiro}` : saudacao;
}

function trendOf(value: number): "up" | "down" | "neutral" {
  if (value > 0.5) return "up";
  if (value < -0.5) return "down";
  return "neutral";
}

function trendLabel(value: number) {
  if (!value) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

export function RelatoriosPage() {
  const { operador } = useAuth();
  const [data, setData] = useState<Painel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obterPainel()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    []
  );

  const series = data?.series30d ?? [];
  const labels = series.map((row) => row.label);

  return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{ justifyContent: "space-between", alignItems: { md: "flex-end" }, gap: 2, mb: 3 }}
        >
          <div>
            <Typography variant="overline" color="primary">
              Painel
            </Typography>
            <Typography variant="h4">{greeting(operador?.nome)}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", textTransform: "capitalize" }}>
              {dateLabel}
            </Typography>
          </div>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button component={RouterLink} to="/vendas" variant="contained" startIcon={<PointOfSaleRoundedIcon />}>
              Registrar venda
            </Button>
            <Button
              component={RouterLink}
              to="/caixa"
              variant="outlined"
              startIcon={<AccountBalanceWalletRoundedIcon />}
            >
              Caixa
            </Button>
            <Button component={RouterLink} to="/produtos/novo" variant="outlined" startIcon={<AddBoxRoundedIcon />}>
              Novo perfume
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {data && (
          <Grid container spacing={2} columns={12}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Alert severity={data.caixa ? "success" : "warning"}>
                {data.caixa
                  ? `Caixa aberto · fundo ${formatMoney(data.caixa.fundoInicial)} · gaveta ${formatMoney(data.caixa.gavetaEsperada)}`
                  : "Caixa fechado. Abra o caixa para vender."}
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Alert severity={data.mes.estoqueBaixo ? "warning" : "info"}>
                {data.mes.estoqueBaixo
                  ? `${data.mes.estoqueBaixo} perfumes no mínimo ou zerados`
                  : "Estoque em dia"}
              </Alert>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Vendas hoje"
                value={formatMoney(data.hoje.faturamento)}
                interval="Comparado com ontem"
                trend={trendOf(data.hoje.vsOntem.faturamento)}
                trendLabel={trendLabel(data.hoje.vsOntem.faturamento)}
                data={series.map((row) => row.faturamento)}
                labels={labels}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Lucro hoje"
                value={formatMoney(data.hoje.lucro)}
                interval="Comparado com ontem"
                trend={trendOf(data.hoje.vsOntem.lucro)}
                trendLabel={trendLabel(data.hoje.vsOntem.lucro)}
                data={series.map((row) => row.lucro)}
                labels={labels}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Atendimentos"
                value={String(data.hoje.tickets)}
                interval={`${data.hoje.unidades} un. vendidas hoje`}
                trend={trendOf(data.hoje.vsOntem.faturamento)}
                trendLabel={trendLabel(data.hoje.vsOntem.faturamento)}
                data={series.map((row) => row.tickets)}
                labels={labels}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <HighlightedCard />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <VendasChart series={series} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LucroBarChart series={data.lucro6Meses} />
            </Grid>

            <Grid size={12}>
              <Typography component="h2" variant="h6" sx={{ mt: 1 }}>
                Detalhes
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, lg: 9 }}>
              <VendasDataGrid rows={data.vendasRecentes} />
            </Grid>
            <Grid size={{ xs: 12, lg: 3 }}>
              <Stack spacing={2}>
                <OrigemPagamentos mes={data.mes} />
                <TopProdutosCard produtos={data.topProdutos} />
              </Stack>
            </Grid>
          </Grid>
        )}
      </Box>
  );
}
