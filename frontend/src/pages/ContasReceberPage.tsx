import { useEffect, useMemo, useState } from "react";
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
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  formatMoney,
  listarContasReceber,
  money,
  receberConta,
  type ContaReceber,
  type ContasReceberPainel,
} from "../lib/api";

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  PARCIAL: "Parcial",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

export function ContasReceberPage() {
  const [data, setData] = useState<ContasReceberPainel | null>(null);
  const [filtro, setFiltro] = useState<"abertas" | "pagas" | "todas">("abertas");
  const [busca, setBusca] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conta, setConta] = useState<ContaReceber | null>(null);
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("DINHEIRO");
  const [busy, setBusy] = useState(false);

  async function load() {
    const painel = await listarContasReceber(filtro);
    setData(painel);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [filtro]);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const list = data?.contas ?? [];
    if (!q) return list;
    return list.filter(
      (c) =>
        c.cliente.nome.toLowerCase().includes(q) ||
        (c.descricao ?? "").toLowerCase().includes(q)
    );
  }, [data, busca]);

  function abrirReceber(row: ContaReceber) {
    setConta(row);
    setValor(String(row.saldo));
    setMetodo("DINHEIRO");
    setError(null);
  }

  async function confirmar() {
    if (!conta) return;
    setBusy(true);
    setError(null);
    try {
      await receberConta(conta.id, {
        valor: money(Number(valor)),
        metodo,
      });
      setConta(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no recebimento.");
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<ContaReceber>[] = [
    {
      field: "cliente",
      headerName: "Cliente",
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_v, row) => row.cliente.nome,
    },
    {
      field: "descricao",
      headerName: "Referência",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => row.descricao || "—",
    },
    {
      field: "createdAt",
      headerName: "Venda",
      width: 110,
      valueGetter: (_v, row) => new Date(row.createdAt).toLocaleDateString("pt-BR"),
    },
    {
      field: "vencimento",
      headerName: "Vence",
      width: 110,
      valueGetter: (_v, row) =>
        row.vencimento ? new Date(row.vencimento).toLocaleDateString("pt-BR") : "—",
    },
    {
      field: "valor",
      headerName: "Valor",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.valor),
    },
    {
      field: "saldo",
      headerName: "Saldo",
      width: 110,
      valueGetter: (_v, row) => formatMoney(row.saldo),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.row.status === "PAGA"
              ? "success"
              : params.row.vencida
                ? "error"
                : params.row.status === "PARCIAL"
                  ? "warning"
                  : "default"
          }
          label={
            params.row.vencida && params.row.status !== "PAGA"
              ? "Atrasada"
              : STATUS_LABEL[params.row.status] ?? params.row.status
          }
        />
      ),
    },
    {
      field: "acoes",
      headerName: "",
      width: 130,
      sortable: false,
      renderCell: (params) =>
        params.row.saldo > 0.009 && params.row.status !== "CANCELADA" ? (
          <Button size="small" onClick={() => abrirReceber(params.row)}>
            Receber
          </Button>
        ) : null,
    },
  ];

  return (
    <Box>
      <Typography variant="overline" sx={{ letterSpacing: "0.2em", color: "primary.main" }}>
        Financeiro
      </Typography>
      <Typography variant="h3" sx={{ fontFamily: "serif", mb: 2 }}>
        Contas a receber
      </Typography>
      {error && !conta ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderTop: "3px solid", borderTopColor: "primary.main" }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <PaymentsRoundedIcon color="primary" />
                <Typography variant="caption" color="text.secondary">
                  EM ABERTO
                </Typography>
              </Stack>
              <Typography variant="h4">{formatMoney(data?.resumo.aReceber ?? 0)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {data?.resumo.quantidadeAbertas ?? 0} contas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderTop: "3px solid", borderTopColor: "error.main" }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <EventBusyRoundedIcon color="error" />
                <Typography variant="caption" color="text.secondary">
                  ATRASADAS
                </Typography>
              </Stack>
              <Typography variant="h4">{data?.resumo.atrasadas ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                vencimento passou de 30 dias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderTop: "3px solid", borderTopColor: "success.main" }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <SavingsRoundedIcon color="success" />
                <Typography variant="caption" color="text.secondary">
                  RECEBIDO NO MÊS
                </Typography>
              </Stack>
              <Typography variant="h4">{formatMoney(data?.resumo.recebidosMes ?? 0)}</Typography>
              <Typography variant="body2" color="text.secondary">
                quitado neste mês
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          size="small"
          label="Buscar cliente"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          sx={{ flex: 1, maxWidth: 360 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          >
            <MenuItem value="abertas">Em aberto</MenuItem>
            <MenuItem value="pagas">Pagas</MenuItem>
            <MenuItem value="todas">Todas</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Card key={row.id} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                  <Box>
                    <Typography fontWeight={600}>{row.cliente.nome}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.descricao} · {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                    </Typography>
                    <Chip
                      size="small"
                      sx={{ mt: 1 }}
                      label={row.vencida ? "Atrasada" : STATUS_LABEL[row.status]}
                      color={row.vencida ? "error" : row.status === "PAGA" ? "success" : "default"}
                    />
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatMoney(row.saldo)}
                  </Typography>
                </Stack>
                {row.saldo > 0.009 && row.status !== "CANCELADA" ? (
                  <Button fullWidth sx={{ mt: 2 }} variant="contained" onClick={() => abrirReceber(row)}>
                    Receber
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 ? (
            <Typography color="text.secondary">Nenhuma conta neste filtro.</Typography>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ display: { xs: "none", md: "block" }, height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <Dialog open={Boolean(conta)} onClose={() => !busy && setConta(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ReceiptLongRoundedIcon />
            <span>Receber de {conta?.cliente.nome}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saldo {formatMoney(conta?.saldo ?? 0)}
            {conta?.descricao ? ` · ${conta.descricao}` : ""}
          </Typography>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Valor"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }}
            />
            <FormControl>
              <InputLabel>Forma</InputLabel>
              <Select label="Forma" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <MenuItem value="DINHEIRO">Dinheiro (entra no caixa)</MenuItem>
                <MenuItem value="PIX">PIX</MenuItem>
                <MenuItem value="DEBITO">Débito</MenuItem>
                <MenuItem value="CREDITO">Crédito</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              O caixa do dia precisa estar aberto. Dinheiro entra na gaveta; PIX e cartão só
              quitam a dívida.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConta(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={confirmar} disabled={busy}>
            {busy ? "Salvando…" : "Confirmar recebimento"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
