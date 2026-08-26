import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { NumberInput } from "../components/NumberInput";
import {
  criarCompra,
  excluirCompra,
  formatMoney,
  listarCompras,
  listarFornecedores,
  listarProdutos,
  type CompraRow,
  type ComprasPainel,
  type Fornecedor,
  type Produto,
} from "../lib/api";

function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
  color,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderTop: `3px solid ${color}` }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <Box sx={{ color, display: "flex" }}>{icon}</Box>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            {title}
          </Typography>
        </Stack>
        <Typography variant="h4" sx={{ color, lineHeight: 1.15 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ComprasPage() {
  const theme = useTheme();
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(endOfMonthISO());
  const [produtoId, setProdutoId] = useState("todos");
  const [fornecedorId, setFornecedorId] = useState("todos");
  const [data, setData] = useState<ComprasPainel | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [formProduto, setFormProduto] = useState("");
  const [formQtd, setFormQtd] = useState("1");
  const [formValor, setFormValor] = useState("");
  const [formFornecedor, setFormFornecedor] = useState("");
  const [formNovoFornecedor, setFormNovoFornecedor] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10));

  async function load(overrides?: {
    from?: string;
    to?: string;
    produtoId?: string;
    fornecedorId?: string;
  }) {
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    const p = overrides?.produtoId ?? produtoId;
    const g = overrides?.fornecedorId ?? fornecedorId;
    const [painel, listaProdutos, listaFornecedores] = await Promise.all([
      listarCompras({
        from: new Date(`${f}T00:00:00`).toISOString(),
        to: new Date(`${t}T23:59:59`).toISOString(),
        produtoId: p === "todos" ? undefined : p,
        fornecedorId: g === "todos" ? undefined : g,
      }),
      listarProdutos(),
      listarFornecedores(),
    ]);
    setData(painel);
    setProdutos(listaProdutos);
    setFornecedores(listaFornecedores);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function aplicarMesAtual() {
    const now = new Date();
    const f = startOfMonthISO(now);
    const t = endOfMonthISO(now);
    setFrom(f);
    setTo(t);
    load({ from: f, to: t }).catch((err) => setError(err.message));
  }

  function aplicarMesAnterior() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const f = startOfMonthISO(d);
    const t = endOfMonthISO(d);
    setFrom(f);
    setTo(t);
    load({ from: f, to: t }).catch((err) => setError(err.message));
  }

  async function filtrar() {
    try {
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao filtrar.");
    }
  }

  async function salvarCompra(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await criarCompra({
        produtoId: formProduto,
        quantidade: Number(formQtd),
        valorUnitario: Number(formValor),
        fornecedorId: formFornecedor || undefined,
        fornecedorNome: formNovoFornecedor || undefined,
        observacao: formObs || undefined,
        data: `${formData}T12:00:00`,
      });
      setOpen(false);
      setFormProduto("");
      setFormQtd("1");
      setFormValor("");
      setFormFornecedor("");
      setFormNovoFornecedor("");
      setFormObs("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar compra.");
    } finally {
      setBusy(false);
    }
  }

  async function remover(row: CompraRow) {
    if (!confirm(`Excluir compra de ${row.produto.nome}? O estoque será reduzido.`)) return;
    try {
      await excluirCompra(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    }
  }

  const selectedProduto = useMemo(
    () => produtos.find((p) => p.id === formProduto),
    [produtos, formProduto]
  );

  const columns: GridColDef<CompraRow>[] = [
    {
      field: "createdAt",
      headerName: "Data",
      width: 120,
      valueGetter: (_v, row) => new Date(row.createdAt).toLocaleDateString("pt-BR"),
    },
    {
      field: "produto",
      headerName: "Produto",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (_v, row) => row.produto.nome,
    },
    { field: "quantidade", headerName: "Qtd", width: 70, type: "number" },
    { field: "unidade", headerName: "Un", width: 70 },
    {
      field: "fornecedor",
      headerName: "Fornecedor",
      flex: 1,
      minWidth: 150,
      valueGetter: (_v, row) => row.fornecedor?.nome ?? "—",
    },
    {
      field: "valorUnitario",
      headerName: "Vlr unit.",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.valorUnitario),
    },
    {
      field: "totalCompra",
      headerName: "Total compra",
      width: 120,
      valueGetter: (_v, row) => formatMoney(row.totalCompra),
    },
    {
      field: "precoVendaRef",
      headerName: "Vlr venda",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.precoVendaRef),
    },
    {
      field: "lucroEstimado",
      headerName: "Lucro est.",
      width: 120,
      valueGetter: (_v, row) => formatMoney(row.lucroEstimado),
    },
    {
      field: "acoes",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton size="small" color="error" onClick={() => remover(params.row)}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const chart = data?.volumePorProduto ?? [];

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" }, gap: 2, mb: 3 }}
      >
        <div>
          <Typography variant="overline" color="primary">
            Entradas
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ShoppingCartRoundedIcon color="primary" />
            <Typography variant="h4">Compras</Typography>
          </Stack>
        </div>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
          Nova compra
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Compras
          </Typography>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: "wrap", alignItems: { lg: "center" } }}
          >
            <TextField
              size="small"
              label="De"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="Até"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Produto</InputLabel>
              <Select
                label="Produto"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {produtos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Fornecedor</InputLabel>
              <Select
                label="Fornecedor"
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {fornecedores.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={filtrar}>
              Filtrar
            </Button>
            <Button variant="outlined" onClick={aplicarMesAtual}>
              Este mês
            </Button>
            <Button variant="outlined" onClick={aplicarMesAnterior}>
              Mês ant.
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {data && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard
                title="Total comprado"
                value={formatMoney(data.resumo.totalComprado)}
                hint={`${data.resumo.lancamentos} lançamento(s)`}
                color="#fca5a5"
                icon={<LocalMallRoundedIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard
                title="Venda estimada"
                value={formatMoney(data.resumo.vendaEstimada)}
                color="#6ee7b7"
                icon={<TrendingUpRoundedIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard
                title="Lucro estimado"
                value={formatMoney(data.resumo.lucroEstimado)}
                color="#93c5fd"
                icon={<AttachMoneyRoundedIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard
                title="Ticket médio"
                value={formatMoney(data.resumo.ticketMedio)}
                hint="por lançamento"
                color="#fcd34d"
                icon={<ReceiptLongRoundedIcon fontSize="small" />}
              />
            </Grid>
          </Grid>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Volume por produto
              </Typography>
              {chart.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 4 }}>
                  Sem compras no período.
                </Typography>
              ) : (
                <BarChart
                  layout="horizontal"
                  height={Math.max(220, chart.length * 42)}
                  borderRadius={6}
                  colors={[theme.palette.primary.main]}
                  yAxis={[{ scaleType: "band", data: chart.map((c) => c.nome), width: 140 }]}
                  xAxis={[{ valueFormatter: (v: number | null) => formatMoney(v ?? 0) }]}
                  series={[
                    {
                      data: chart.map((c) => c.total),
                      label: "Total comprado",
                      valueFormatter: (v) => formatMoney(v ?? 0),
                    },
                  ]}
                  margin={{ left: 0, right: 24, top: 10, bottom: 10 }}
                  grid={{ vertical: true }}
                  hideLegend
                />
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <DataGrid
                autoHeight
                rows={data.compras}
                columns={columns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: "Nenhuma compra no período" }}
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
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={salvarCompra}>
          <DialogTitle>Nova compra</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label="Data"
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <FormControl size="small" fullWidth required>
                <InputLabel>Produto</InputLabel>
                <Select
                  label="Produto"
                  value={formProduto}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormProduto(id);
                    const p = produtos.find((x) => x.id === id);
                    if (p && !formValor) setFormValor(String(p.precoCusto));
                  }}
                >
                  {produtos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} · {p.marca}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedProduto && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Estoque atual {selectedProduto.estoque} · venda{" "}
                  {formatMoney(selectedProduto.precoVenda)}
                </Typography>
              )}
              <Box>
                <Typography variant="caption">Quantidade</Typography>
                <NumberInput
                  required
                  min={1}
                  value={formQtd}
                  onChange={(e) => setFormQtd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </Box>
              <Box>
                <Typography variant="caption">Valor unitário (custo)</Typography>
                <NumberInput
                  required
                  min={0}
                  step="0.01"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Fornecedor</InputLabel>
                <Select
                  label="Fornecedor"
                  value={formFornecedor}
                  onChange={(e) => setFormFornecedor(e.target.value)}
                >
                  <MenuItem value="">Novo / nenhum</MenuItem>
                  {fornecedores.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!formFornecedor && (
                <TextField
                  size="small"
                  label="Nome do fornecedor"
                  value={formNovoFornecedor}
                  onChange={(e) => setFormNovoFornecedor(e.target.value)}
                  fullWidth
                />
              )}
              <TextField
                size="small"
                label="Observação"
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={busy || !formProduto}>
              {busy ? "Salvando…" : "Confirmar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
