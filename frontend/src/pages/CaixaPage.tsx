import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { NumberInput } from "../components/NumberInput";
import {
  abrirCaixa,
  fecharCaixa,
  formatMoney,
  historicoCaixa,
  movimentoCaixa,
  obterCaixaAtual,
  type CaixaHistorico,
  type ResumoCaixa,
} from "../lib/api";

type FiltroMov = "TODOS" | "VENDA" | "COMPRA" | "SANGRIA" | "SUPRIMENTO";

const tipoLabel: Record<string, string> = {
  VENDA: "Venda",
  COMPRA: "Compra",
  SANGRIA: "Despesa",
  SUPRIMENTO: "Suprimento",
};

const tipoColor: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
  VENDA: "success",
  COMPRA: "error",
  SANGRIA: "warning",
  SUPRIMENTO: "info",
};

export function CaixaPage() {
  const theme = useTheme();
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<CaixaHistorico | null>(null);
  const [fundo, setFundo] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroMov>("TODOS");
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<"SANGRIA" | "SUPRIMENTO">("SANGRIA");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [atual, hist] = await Promise.all([
      obterCaixaAtual(),
      historicoCaixa(new Date().toISOString()),
    ]);
    setAberto(Boolean(atual.caixa));
    setResumo(atual.resumo);
    setHistorico(hist);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function abrir(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await abrirCaixa(Number(fundo));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir.");
    } finally {
      setBusy(false);
    }
  }

  async function mover() {
    setError(null);
    setBusy(true);
    try {
      const data = await movimentoCaixa({
        tipo: movTipo,
        valor: Number(valor),
        motivo,
      });
      setResumo(data.resumo);
      setValor("");
      setMotivo("");
      setMovOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no movimento.");
    } finally {
      setBusy(false);
    }
  }

  async function fechar() {
    if (!confirm("Fechar o caixa do dia? As vendas ficam bloqueadas até a próxima abertura.")) {
      return;
    }
    try {
      await fecharCaixa();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao fechar.");
    }
  }

  const movimentos = useMemo(() => {
    const list = resumo?.movimentos ?? [];
    if (filtro === "TODOS") return list;
    return list.filter((m) => m.tipo === filtro);
  }, [resumo, filtro]);

  const movColumns: GridColDef[] = [
    {
      field: "tipo",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => (
        <Chip size="small" label={tipoLabel[params.value] ?? params.value} color={tipoColor[params.value] ?? "default"} />
      ),
    },
    { field: "descricao", headerName: "Descrição", flex: 1.4, minWidth: 200 },
    {
      field: "entrada",
      headerName: "Entrada",
      width: 120,
      renderCell: (params) =>
        params.value > 0 ? (
          <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
            {formatMoney(params.value)}
          </Typography>
        ) : (
          "—"
        ),
    },
    {
      field: "saida",
      headerName: "Saída",
      width: 120,
      renderCell: (params) =>
        params.value > 0 ? (
          <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
            {formatMoney(params.value)}
          </Typography>
        ) : (
          "—"
        ),
    },
    {
      field: "hora",
      headerName: "Hora",
      width: 90,
      valueGetter: (_v, row) =>
        new Date(row.hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  const histColumns: GridColDef[] = [
    {
      field: "abertoEm",
      headerName: "Data",
      width: 120,
      valueGetter: (_v, row) => new Date(row.abertoEm).toLocaleDateString("pt-BR"),
    },
    {
      field: "fundoInicial",
      headerName: "Abertura",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.fundoInicial),
    },
    {
      field: "compras",
      headerName: "Compras",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.compras),
    },
    {
      field: "despesas",
      headerName: "Despesas",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.despesas),
    },
    {
      field: "vendas",
      headerName: "Vendas",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.vendas),
    },
    {
      field: "saldo",
      headerName: "Saldo",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.saldo),
    },
    {
      field: "lucro",
      headerName: "Lucro",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.lucro),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value === "ABERTO" ? "Aberto" : "Fechado"}
          color={params.value === "ABERTO" ? "success" : "default"}
        />
      ),
    },
  ];

  const lucro7 = historico?.lucro7Dias ?? [];

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 3 }}>
        <AccountBalanceWalletRoundedIcon color="primary" />
        <Typography variant="h4">Caixa</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!aberto && (
        <Card variant="outlined" sx={{ mb: 2, maxWidth: 480 }}>
          <CardContent>
            <Typography variant="h6">Abrir caixa</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Informe o troco deixado na gaveta para começar o dia.
            </Typography>
            <form onSubmit={abrir}>
              <Typography variant="caption">Fundo inicial</Typography>
              <NumberInput
                required
                min={0}
                step="0.01"
                value={fundo}
                onChange={(e) => setFundo(e.target.value)}
                className="mt-1 mb-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
              />
              <Button type="submit" variant="contained" disabled={busy}>
                Abrir caixa
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {aberto && resumo && (
        <>
          <Card
            sx={{
              mb: 2,
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, rgba(30,58,95,0.08), #ffffff)"
                  : "linear-gradient(135deg, rgba(196,165,116,0.28), rgba(22,18,16,0.95))",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography
                    variant="caption"
                    sx={{ letterSpacing: "0.16em", textTransform: "uppercase", color: "text.secondary" }}
                  >
                    Saldo em caixa
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5, color: "primary.main" }}>
                    {formatMoney(resumo.gavetaEsperada)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                    Abertura: {formatMoney(resumo.fundoInicial)} · Dinheiro{" "}
                    {formatMoney(resumo.totais.dinheiro)} · PIX {formatMoney(resumo.totais.pix)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(110,231,183,0.12)",
                      border: "1px solid rgba(110,231,183,0.25)",
                      alignItems: "center",
                    }}
                  >
                    <CheckCircleRoundedIcon sx={{ color: "success.main" }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Lucro do dia
                      </Typography>
                      <Typography variant="h5" sx={{ color: "success.main" }}>
                        {formatMoney(resumo.lucro ?? 0)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderTop: "3px solid #fca5a5", height: "100%" }}>
                <CardContent>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                    Compras
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#fca5a5", mt: 1 }}>
                    {formatMoney(resumo.compras?.total ?? 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {resumo.compras?.quantidade ?? 0} lançamento(s)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderTop: "3px solid #fcd34d", height: "100%" }}>
                <CardContent>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                    Despesas
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#fcd34d", mt: 1 }}>
                    {formatMoney(resumo.despesas?.total ?? 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {resumo.despesas?.quantidade ?? 0} sangria(s)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderTop: "3px solid #93c5fd", height: "100%" }}>
                <CardContent>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                    Vendas
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#93c5fd", mt: 1 }}>
                    {formatMoney(resumo.totais.vendas)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {resumo.quantidadeVendas} venda(s)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: "text.secondary" }}>
                Lançamentos rápidos
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button
                  component={RouterLink}
                  to="/compras"
                  variant="outlined"
                  startIcon={<AddShoppingCartRoundedIcon />}
                >
                  Nova compra
                </Button>
                <Button
                  component={RouterLink}
                  to="/vendas"
                  variant="contained"
                  color="success"
                  startIcon={<PointOfSaleRoundedIcon />}
                >
                  Nova venda
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<RemoveCircleOutlineRoundedIcon />}
                  onClick={() => {
                    setMovTipo("SANGRIA");
                    setMovOpen(true);
                  }}
                >
                  Nova despesa
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingBagRoundedIcon />}
                  onClick={() => {
                    setMovTipo("SUPRIMENTO");
                    setMovOpen(true);
                  }}
                >
                  Suprimento
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<LockRoundedIcon />}
                  onClick={fechar}
                  sx={{ ml: { sm: "auto" } }}
                >
                  Fechar caixa
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                sx={{ justifyContent: "space-between", alignItems: { md: "center" }, gap: 2, mb: 2 }}
              >
                <Typography variant="h6">Movimentações do dia</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={filtro}
                  onChange={(_e, v) => v && setFiltro(v)}
                >
                  <ToggleButton value="TODOS">Todos</ToggleButton>
                  <ToggleButton value="COMPRA">Compras</ToggleButton>
                  <ToggleButton value="VENDA">Vendas</ToggleButton>
                  <ToggleButton value="SANGRIA">Despesas</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <DataGrid
                autoHeight
                rows={movimentos}
                columns={movColumns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: "Nenhuma movimentação hoje" }}
                sx={{
                  borderColor: "rgba(196, 165, 116, 0.22)",
                  "& .MuiDataGrid-cell": {
                    borderColor: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "rgba(196,165,116,0.06)",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderColor: "rgba(255,255,255,0.06)",
                  },
                }}
              />
              <Stack direction="row" spacing={3} sx={{ mt: 2, justifyContent: "flex-end" }}>
                <Typography variant="body2">
                  Entradas:{" "}
                  <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
                    {formatMoney(resumo.totaisMovimento?.entrada ?? 0)}
                  </Box>
                </Typography>
                <Typography variant="body2">
                  Saídas:{" "}
                  <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                    {formatMoney(resumo.totaisMovimento?.saida ?? 0)}
                  </Box>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      {historico && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Histórico de caixas
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
              Lucro — últimos 7 dias
            </Typography>
            <BarChart
              layout="horizontal"
              height={Math.max(200, lucro7.length * 36)}
              borderRadius={6}
              yAxis={[{ scaleType: "band", data: lucro7.map((d) => d.label), width: 70 }]}
              series={[
                {
                  data: lucro7.map((d) => d.lucro),
                  label: "Lucro",
                  color: theme.palette.primary.main,
                  valueFormatter: (v) => formatMoney(v ?? 0),
                },
              ]}
              margin={{ left: 0, right: 24, top: 8, bottom: 8 }}
              grid={{ vertical: true }}
              hideLegend
            />
            <Box sx={{ mt: 3 }}>
              <DataGrid
                autoHeight
                rows={historico.caixas}
                columns={histColumns}
                getRowId={(row) => row.id}
                pageSizeOptions={[5, 10]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: "Nenhum caixa neste mês" }}
                sx={{
                  borderColor: "rgba(196, 165, 116, 0.22)",
                  "& .MuiDataGrid-cell": {
                    borderColor: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "rgba(196,165,116,0.06)",
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog open={movOpen} onClose={() => setMovOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{movTipo === "SANGRIA" ? "Nova despesa (sangria)" : "Suprimento"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption">Valor</Typography>
              <NumberInput
                required
                min={0.01}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
              />
            </Box>
            <TextField
              size="small"
              label="Motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMovOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={mover} disabled={busy || !valor}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
