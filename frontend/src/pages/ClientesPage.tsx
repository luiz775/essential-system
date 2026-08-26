import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import {
  excluirCliente,
  formatMoney,
  obterClientesPainel,
  salvarCliente,
  type Cliente,
  type ClientesPainel,
} from "../lib/api";

type SortKey = "nome" | "total" | "vendas" | "ultima";

const emptyForm = {
  nome: "",
  documento: "",
  tipo: "VAREJO",
  whatsapp: "",
  telefone: "",
  email: "",
  produtosDescricao: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  observacao: "",
  ativo: true,
};

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

function enderecoLinha(c: Cliente) {
  const linha1 = [c.endereco, c.numero].filter(Boolean).join(", ");
  const linha2 = [c.bairro, c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade || c.uf, c.cep]
    .filter(Boolean)
    .join(" · ");
  const parts = [linha1, linha2].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function ClientesPage() {
  const [data, setData] = useState<ClientesPainel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState<SortKey>("nome");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  async function load() {
    setData(await obterClientesPainel());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = data?.clientes ?? [];
    if (q) {
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.produtosDescricao ?? "").toLowerCase().includes(q) ||
          (c.cidade ?? "").toLowerCase().includes(q) ||
          (c.documento ?? "").includes(q) ||
          (c.whatsapp ?? "").includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (ordenar === "total") return (b.totalVendido ?? 0) - (a.totalVendido ?? 0);
      if (ordenar === "vendas") return (b.vendasCount ?? 0) - (a.vendasCount ?? 0);
      if (ordenar === "ultima") {
        return (
          new Date(b.ultimaVenda ?? 0).getTime() - new Date(a.ultimaVenda ?? 0).getTime()
        );
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [data, busca, ordenar]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({
      nome: c.nome,
      documento: c.documento ?? "",
      tipo: c.tipo === "ATACADO" ? "ATACADO" : "VAREJO",
      whatsapp: c.whatsapp ?? "",
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      produtosDescricao: c.produtosDescricao ?? "",
      endereco: c.endereco ?? "",
      numero: c.numero ?? "",
      bairro: c.bairro ?? "",
      cidade: c.cidade ?? "",
      uf: c.uf ?? "",
      cep: c.cep ?? "",
      observacao: c.observacao ?? "",
      ativo: c.ativo,
    });
    setOpen(true);
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await salvarCliente(
        {
          nome: form.nome,
          documento: form.documento || undefined,
          tipo: form.tipo,
          whatsapp: form.whatsapp || undefined,
          telefone: form.telefone || undefined,
          email: form.email || undefined,
          produtosDescricao: form.produtosDescricao || undefined,
          endereco: form.endereco || undefined,
          numero: form.numero || undefined,
          bairro: form.bairro || undefined,
          cidade: form.cidade || undefined,
          uf: form.uf || undefined,
          cep: form.cep || undefined,
          observacao: form.observacao || undefined,
          ativo: form.ativo,
        },
        editing?.id
      );
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remover(c: Cliente) {
    if (!confirm(`Remover ou inativar ${c.nome}?`)) return;
    try {
      await excluirCliente(c.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    }
  }

  const columns: GridColDef<Cliente>[] = [
    {
      field: "nome",
      headerName: "Cliente",
      flex: 1.1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<Cliente>) => (
        <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, display: "block" }}>
            {params.row.nome}
          </Typography>
          {params.row.documento ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {params.row.documento}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      field: "tipo",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => {
        const atacado = params.row.tipo === "ATACADO";
        return (
          <Chip
            size="small"
            icon={atacado ? <Inventory2RoundedIcon /> : <LocalMallRoundedIcon />}
            label={atacado ? "Atacado" : "Varejo"}
            color={atacado ? "warning" : "success"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "produtosDescricao",
      headerName: "Produtos",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.produtosDescricao || "—",
    },
    {
      field: "endereco",
      headerName: "Endereço",
      flex: 1.3,
      minWidth: 180,
      valueGetter: (_v, row) => enderecoLinha(row),
    },
    {
      field: "whatsapp",
      headerName: "WhatsApp",
      width: 150,
      renderCell: (params) =>
        params.row.whatsapp ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", height: "100%" }}>
            <PhoneIphoneRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
            <Typography variant="body2" sx={{ color: "success.main" }}>
              {params.row.whatsapp}
            </Typography>
          </Stack>
        ) : (
          "—"
        ),
    },
    {
      field: "vendasCount",
      headerName: "Vendas",
      width: 90,
      type: "number",
    },
    {
      field: "totalVendido",
      headerName: "Total",
      width: 120,
      valueGetter: (_v, row) => formatMoney(row.totalVendido ?? 0),
    },
    {
      field: "ultimaVenda",
      headerName: "Última",
      width: 110,
      valueGetter: (_v, row) =>
        row.ultimaVenda ? new Date(row.ultimaVenda).toLocaleDateString("pt-BR") : "—",
    },
    {
      field: "acoes",
      headerName: "",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
          <IconButton size="small" onClick={() => openEdit(params.row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => remover(params.row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const resumo = data?.resumo;

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 3 }}>
        <GroupsRoundedIcon color="primary" />
        <Typography variant="h4">Clientes</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {resumo && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              title="Clientes"
              value={String(resumo.total)}
              hint={`${resumo.ativos} ativos`}
              color="#93c5fd"
              icon={<GroupsRoundedIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              title="Total vendido"
              value={formatMoney(resumo.totalVendido)}
              color="#6ee7b7"
              icon={<ReceiptLongRoundedIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              title="Vendas no mês"
              value={formatMoney(resumo.vendasMes)}
              color="#fcd34d"
              icon={<CalendarMonthRoundedIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              title="Maior cliente"
              value={
                resumo.maiorCliente
                  ? resumo.maiorCliente.nome.length > 18
                    ? `${resumo.maiorCliente.nome.slice(0, 18)}…`
                    : resumo.maiorCliente.nome
                  : "—"
              }
              hint={
                resumo.maiorCliente ? formatMoney(resumo.maiorCliente.total) : undefined
              }
              color="#c4a574"
              icon={<EmojiEventsRoundedIcon fontSize="small" />}
            />
          </Grid>
        </Grid>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2, mb: 2 }}
          >
            <Typography variant="h6">Clientes</Typography>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
              Novo cliente
            </Button>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            useFlexGap
            sx={{ mb: 2, flexWrap: "wrap" }}
          >
            <TextField
              size="small"
              label="Buscar"
              placeholder="Nome, produto, cidade…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{ minWidth: 240, flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Ordenar por</InputLabel>
              <Select
                label="Ordenar por"
                value={ordenar}
                onChange={(e) => setOrdenar(e.target.value as SortKey)}
              >
                <MenuItem value="nome">Nome A-Z</MenuItem>
                <MenuItem value="total">Maior total</MenuItem>
                <MenuItem value="vendas">Mais vendas</MenuItem>
                <MenuItem value="ultima">Última venda</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            rowHeight={64}
            localeText={{ noRowsLabel: "Nenhum cliente cadastrado" }}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <form onSubmit={salvar}>
          <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  label="Nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="CPF / CNPJ"
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label="Tipo"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  >
                    <MenuItem value="VAREJO">Varejo</MenuItem>
                    <MenuItem value="ATACADO">Atacado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Telefone"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="E-mail"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Produtos / preferências"
                  placeholder="Ex.: Perfumes femininos"
                  value={form.produtosDescricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, produtosDescricao: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Endereço"
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Número"
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Bairro"
                  value={form.bairro}
                  onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="UF"
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="CEP"
                  value={form.cep}
                  onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Observação"
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.ativo}
                      onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                    />
                  }
                  label="Ativo"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
