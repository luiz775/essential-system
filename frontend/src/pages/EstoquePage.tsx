import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { NumberInput } from "../components/NumberInput";
import { ProductPhoto } from "../components/ProductPhoto";
import {
  ajustarEstoque,
  formatMoney,
  listarProdutos,
  type Produto,
} from "../lib/api";

type StatusFilter = "todos" | "ativos" | "inativos" | "baixo" | "zerado";

function margem(produto: Produto) {
  const custo = Number(produto.precoCusto);
  const venda = Number(produto.precoVenda);
  if (!custo) return 0;
  return ((venda - custo) / custo) * 100;
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
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderTop: `3px solid ${color}`,
        bgcolor: "background.paper",
      }}
    >
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
        <Typography variant="h4" sx={{ color, lineHeight: 1.1 }}>
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

export function EstoquePage() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [ajuste, setAjuste] = useState<Produto | null>(null);
  const [tipo, setTipo] = useState<"ENTRADA" | "PERDA">("ENTRADA");
  const [qtd, setQtd] = useState("1");
  const [motivo, setMotivo] = useState("");

  async function load() {
    setProdutos(await listarProdutos());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const marcas = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.marca))).sort(),
    [produtos]
  );

  const stats = useMemo(() => {
    const ativos = produtos.filter((p) => p.ativo);
    const inativos = produtos.filter((p) => !p.ativo).length;
    const baixo = produtos.filter((p) => p.estoque <= p.estoqueMin).length;
    const topMargem = [...produtos].sort((a, b) => margem(b) - margem(a))[0];
    return {
      ativos: ativos.length,
      inativos,
      marcas: marcas.length,
      baixo,
      topNome: topMargem?.nome ?? "—",
      topMargem: topMargem ? `${margem(topMargem).toFixed(1)}%` : "—",
    };
  }, [produtos, marcas]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const matchBusca =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.codigoBarras ?? "").includes(q);
      const matchMarca = marca === "todas" || p.marca === marca;
      const matchStatus =
        status === "todos" ||
        (status === "ativos" && p.ativo) ||
        (status === "inativos" && !p.ativo) ||
        (status === "baixo" && p.estoque > 0 && p.estoque <= p.estoqueMin) ||
        (status === "zerado" && p.estoque <= 0);
      return matchBusca && matchMarca && matchStatus;
    });
  }, [produtos, busca, marca, status]);

  async function salvarAjuste(event: React.FormEvent) {
    event.preventDefault();
    if (!ajuste) return;
    try {
      await ajustarEstoque(ajuste.id, {
        tipo,
        quantidade: Number(qtd),
        motivo,
      });
      setAjuste(null);
      setQtd("1");
      setMotivo("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no ajuste.");
    }
  }

  const columns: GridColDef<Produto>[] = [
    {
      field: "nome",
      headerName: "Produto",
      flex: 1.4,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams<Produto>) => (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            py: 0.5,
          }}
        >
          <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <ProductPhoto
              src={params.row.fotoUrl}
              alt={params.row.nome}
              className="h-10 w-10 rounded-xl"
              iconSize={14}
            />
          </Box>
          <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 500, lineHeight: 1.3, display: "block" }}
            >
              {params.row.nome}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: "text.secondary", lineHeight: 1.3, display: "block" }}
            >
              {params.row.marca} · {params.row.volumeMl} ml
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { field: "familia", headerName: "Linha", width: 130 },
    {
      field: "codigoBarras",
      headerName: "Código",
      width: 140,
      valueGetter: (_v, row) => row.codigoBarras ?? row.sku ?? "—",
    },
    {
      field: "precoCusto",
      headerName: "Custo",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.precoCusto),
    },
    {
      field: "precoVenda",
      headerName: "Venda",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.precoVenda),
    },
    {
      field: "margem",
      headerName: "Margem",
      width: 100,
      valueGetter: (_v, row) => `${margem(row).toFixed(1)}%`,
    },
    {
      field: "estoqueMin",
      headerName: "Mín.",
      width: 80,
      type: "number",
    },
    {
      field: "estoque",
      headerName: "Estoque",
      width: 130,
      renderCell: (params) => {
        const baixo = params.row.estoque <= params.row.estoqueMin;
        const zerado = params.row.estoque <= 0;
        return (
          <Chip
            size="small"
            label={zerado ? "Zerado" : baixo ? `Baixo · ${params.row.estoque}` : params.row.estoque}
            color={zerado ? "error" : baixo ? "warning" : "success"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "ativo",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.row.ativo ? "Ativo" : "Inativo"}
          color={params.row.ativo ? "success" : "default"}
        />
      ),
    },
    {
      field: "acoes",
      headerName: "Ações",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: "100%" }}>
          <Button size="small" onClick={() => setAjuste(params.row)}>
            Ajuste
          </Button>
          <Button size="small" onClick={() => navigate(`/produtos/${params.row.id}`)}>
            Editar
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" }, gap: 2, mb: 3 }}
      >
        <div>
          <Typography variant="overline" color="primary">
            Inventário
          </Typography>
          <Typography variant="h4">Produtos</Typography>
        </div>
        <Button
          component={RouterLink}
          to="/produtos/novo"
          variant="contained"
          startIcon={<AddRoundedIcon />}
        >
          Novo produto
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryCard
            title="Ativos"
            value={String(stats.ativos)}
            hint={`${stats.inativos} inativo(s)`}
            color="#6ee7b7"
            icon={<CheckCircleRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryCard
            title="Marcas"
            value={String(stats.marcas)}
            hint="casas no catálogo"
            color="#93c5fd"
            icon={<FolderRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryCard
            title="Estoque baixo"
            value={String(stats.baixo)}
            hint="produto(s) no mínimo ou zerados"
            color="#fcd34d"
            icon={<WarningAmberRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryCard
            title="Maior margem"
            value={stats.topNome.length > 18 ? `${stats.topNome.slice(0, 18)}…` : stats.topNome}
            hint={stats.topMargem}
            color="#c4a574"
            icon={<EmojiEventsRoundedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Produtos
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            useFlexGap
            sx={{ mb: 2, flexWrap: "wrap" }}
          >
            <TextField
              size="small"
              label="Buscar"
              placeholder="Nome, marca, SKU…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{ minWidth: 220, flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Marca</InputLabel>
              <Select
                label="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              >
                <MenuItem value="todas">Todas</MenuItem>
                {marcas.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativos">Ativos</MenuItem>
                <MenuItem value="inativos">Inativos</MenuItem>
                <MenuItem value="baixo">Estoque baixo</MenuItem>
                <MenuItem value="zerado">Zerados</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <DataGrid
            autoHeight
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            rowHeight={72}
            getRowHeight={() => 72}
            localeText={{ noRowsLabel: "Nenhum produto encontrado" }}
            sx={{
              borderColor: "rgba(196, 165, 116, 0.22)",
              "& .MuiDataGrid-cell": {
                borderColor: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                py: 0,
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "rgba(196,165,116,0.06)",
              },
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(ajuste)} onClose={() => setAjuste(null)} fullWidth maxWidth="sm">
        <form onSubmit={salvarAjuste}>
          <DialogTitle>Ajuste de estoque</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {ajuste?.nome} · atual {ajuste?.estoque} un.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant={tipo === "ENTRADA" ? "contained" : "outlined"}
                onClick={() => setTipo("ENTRADA")}
              >
                Entrada
              </Button>
              <Button
                variant={tipo === "PERDA" ? "contained" : "outlined"}
                color={tipo === "PERDA" ? "error" : "primary"}
                onClick={() => setTipo("PERDA")}
              >
                Perda
              </Button>
            </Stack>
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Quantidade
            </Typography>
            <NumberInput
              required
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            />
            <TextField
              fullWidth
              label="Motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAjuste(null)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Confirmar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
