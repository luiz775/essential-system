import { useMemo, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  formatMoney,
  METODO_LABEL,
  obterRelatorioGerencial,
  type RelatorioGerencial,
  type RelatorioTipo,
} from "../lib/api";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const TIPOS: { value: RelatorioTipo; label: string }[] = [
  { value: "mensal", label: "Mensal — Resumo geral do mês" },
  { value: "vendas", label: "Vendas — Detalhamento do período" },
  { value: "produtos", label: "Produtos — Mais vendidos" },
  { value: "clientes", label: "Clientes — Faturamento por cliente" },
  { value: "compras", label: "Compras — Entradas de estoque" },
];

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

function labelMetodo(metodo: string) {
  return METODO_LABEL[metodo as keyof typeof METODO_LABEL] ?? metodo;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(";")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RelatoriosGerenciaisPage() {
  const now = new Date();
  const [tipo, setTipo] = useState<RelatorioTipo>("mensal");
  const [draftTipo, setDraftTipo] = useState<RelatorioTipo>("mensal");
  const [draftMes, setDraftMes] = useState(now.getMonth() + 1);
  const [draftAno, setDraftAno] = useState(now.getFullYear());
  const [data, setData] = useState<RelatorioGerencial | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anos = useMemo(() => {
    const list: number[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) list.push(y);
    return list;
  }, [now]);

  async function gerar() {
    setBusy(true);
    setError(null);
    try {
      const relatorio = await obterRelatorioGerencial({
        tipo: draftTipo,
        ano: draftAno,
        mes: draftMes,
      });
      setTipo(draftTipo);
      setData(relatorio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar relatório.");
      setData(null);
    } finally {
      setBusy(false);
    }
  }

  function limpar() {
    const n = new Date();
    setDraftTipo("mensal");
    setDraftMes(n.getMonth() + 1);
    setDraftAno(n.getFullYear());
    setTipo("mensal");
    setData(null);
    setError(null);
  }

  function exportarCsv() {
    if (!data) return;
    const periodo = `${String(data.mes).padStart(2, "0")}-${data.ano}`;
    if (data.tipo === "vendas" || data.tipo === "mensal") {
      downloadCsv(`relatorio-vendas-${periodo}.csv`, [
        ["Data", "Cliente", "Origem", "Itens", "Pagamento", "Total"],
        ...data.vendas.map((v) => [
          new Date(v.createdAt).toLocaleString("pt-BR"),
          v.clienteNome || "Consumidor final",
          v.origem,
          v.itens,
          v.pagamento
            .split(" + ")
            .map((m) => labelMetodo(m))
            .join(" + "),
          String(v.total).replace(".", ","),
        ]),
      ]);
    }
    if (data.tipo === "produtos" || data.tipo === "mensal") {
      downloadCsv(`relatorio-produtos-${periodo}.csv`, [
        ["Produto", "Marca", "Quantidade", "Faturamento"],
        ...data.topProdutos.map((p) => [
          p.nome,
          p.marca,
          String(p.quantidade),
          String(p.faturamento).replace(".", ","),
        ]),
      ]);
    }
    if (data.tipo === "clientes") {
      downloadCsv(`relatorio-clientes-${periodo}.csv`, [
        ["Cliente", "Documento", "Tipo", "Vendas", "Total"],
        ...data.clientes.map((c) => [
          c.nome,
          c.documento || "",
          c.tipo,
          String(c.vendasCount),
          String(c.totalVendido).replace(".", ","),
        ]),
      ]);
    }
    if (data.tipo === "compras") {
      downloadCsv(`relatorio-compras-${periodo}.csv`, [
        ["Data", "Produto", "Marca", "Fornecedor", "Qtd", "Total"],
        ...data.compras.map((c) => [
          new Date(c.createdAt).toLocaleString("pt-BR"),
          c.produto,
          c.marca,
          c.fornecedor,
          String(c.quantidade),
          String(c.total).replace(".", ","),
        ]),
      ]);
    }
  }

  const vendasCols: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "Data",
      flex: 1,
      minWidth: 150,
      valueGetter: (_v, row) => new Date(row.createdAt).toLocaleString("pt-BR"),
    },
    {
      field: "clienteNome",
      headerName: "Cliente",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.clienteNome || "Consumidor final",
    },
    { field: "itens", headerName: "Itens", flex: 1.4, minWidth: 180 },
    {
      field: "pagamento",
      headerName: "Pagamento",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (_v, row) =>
        String(row.pagamento)
          .split(" + ")
          .map((m: string) => labelMetodo(m))
          .join(" + "),
    },
    {
      field: "total",
      headerName: "Total",
      width: 120,
      valueGetter: (_v, row) => formatMoney(row.total),
    },
  ];

  const produtosCols: GridColDef[] = [
    { field: "nome", headerName: "Produto", flex: 1.2, minWidth: 160 },
    { field: "marca", headerName: "Marca", flex: 0.8, minWidth: 110 },
    { field: "quantidade", headerName: "Qtd", width: 90 },
    {
      field: "faturamento",
      headerName: "Faturamento",
      width: 130,
      valueGetter: (_v, row) => formatMoney(row.faturamento),
    },
  ];

  const clientesCols: GridColDef[] = [
    { field: "nome", headerName: "Cliente", flex: 1.2, minWidth: 160 },
    {
      field: "documento",
      headerName: "Documento",
      flex: 0.8,
      minWidth: 120,
      valueGetter: (_v, row) => row.documento || "—",
    },
    { field: "tipo", headerName: "Tipo", width: 100 },
    { field: "vendasCount", headerName: "Vendas", width: 90 },
    {
      field: "totalVendido",
      headerName: "Total",
      width: 130,
      valueGetter: (_v, row) => formatMoney(row.totalVendido),
    },
  ];

  const comprasCols: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "Data",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => new Date(row.createdAt).toLocaleString("pt-BR"),
    },
    { field: "produto", headerName: "Produto", flex: 1.1, minWidth: 140 },
    { field: "fornecedor", headerName: "Fornecedor", flex: 1, minWidth: 120 },
    { field: "quantidade", headerName: "Qtd", width: 80 },
    {
      field: "total",
      headerName: "Total",
      width: 120,
      valueGetter: (_v, row) => formatMoney(row.total),
    },
  ];

  const showVendas = data && (tipo === "mensal" || tipo === "vendas");
  const showProdutos = data && (tipo === "mensal" || tipo === "produtos");
  const showClientes = data && tipo === "clientes";
  const showCompras = data && tipo === "compras";

  return (
    <Box
      className="relatorios-print-root"
      sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", mb: 3 }}
        className="print:mb-2"
      >
        <ShowChartRoundedIcon color="primary" sx={{ fontSize: 34 }} />
        <Box>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: "0.18em" }}>
            Gestão
          </Typography>
          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            Relatórios Gerenciais
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" className="print:hidden" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2.5} sx={{ alignItems: "flex-end" }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="tipo-relatorio">Tipo de relatório</InputLabel>
                <Select
                  labelId="tipo-relatorio"
                  label="Tipo de relatório"
                  value={draftTipo}
                  onChange={(e) => setDraftTipo(e.target.value as RelatorioTipo)}
                >
                  {TIPOS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="mes-relatorio">Mês</InputLabel>
                <Select
                  labelId="mes-relatorio"
                  label="Mês"
                  value={draftMes}
                  onChange={(e) => setDraftMes(Number(e.target.value))}
                >
                  {MESES.map((nome, i) => (
                    <MenuItem key={nome} value={i + 1}>
                      {nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="ano-relatorio">Ano</InputLabel>
                <Select
                  labelId="ano-relatorio"
                  label="Ano"
                  value={draftAno}
                  onChange={(e) => setDraftAno(Number(e.target.value))}
                >
                  {anos.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 3, flexWrap: "wrap" }}
          >
            <Button
              variant="contained"
              startIcon={<BarChartRoundedIcon />}
              onClick={gerar}
              disabled={busy}
            >
              {busy ? "Gerando…" : "Gerar Relatório"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAltRoundedIcon />}
              onClick={limpar}
              disabled={busy}
            >
              Limpar
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintRoundedIcon />}
              onClick={() => window.print()}
              disabled={!data}
            >
              Imprimir
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={exportarCsv}
              disabled={!data}
            >
              Exportar CSV
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} className="print:hidden">
          {error}
        </Alert>
      ) : null}

      {!data && !error ? (
        <Card variant="outlined" className="print:hidden">
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <AssessmentRoundedIcon color="primary" sx={{ fontSize: 48, mb: 1, opacity: 0.8 }} />
            <Typography variant="h6">Escolha o tipo e o período</Typography>
            <Typography variant="body2" color="text.secondary">
              Clique em Gerar Relatório para ver o resumo do mês.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <Stack spacing={3}>
          <Box className="print:block">
            <Typography variant="h5" sx={{ mb: 0.5, textTransform: "capitalize" }}>
              {TIPOS.find((t) => t.value === tipo)?.label.split(" — ")[0]} · {data.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gerado em {new Date().toLocaleString("pt-BR")}
            </Typography>
          </Box>

          {data ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryCard
                  title="Faturamento"
                  value={formatMoney(data.resumo.faturamento)}
                  hint={`${data.resumo.tickets} vendas`}
                  icon={<AttachMoneyRoundedIcon />}
                  color="#c4a574"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryCard
                  title="Lucro bruto"
                  value={formatMoney(data.resumo.lucro)}
                  hint={`${data.resumo.unidades} unidades`}
                  icon={<TrendingUpRoundedIcon />}
                  color="#7cb88a"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryCard
                  title="Compras"
                  value={formatMoney(data.resumo.compras)}
                  hint={`Despesas ${formatMoney(data.resumo.despesas)}`}
                  icon={<ShoppingCartRoundedIcon />}
                  color="#e09a6a"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryCard
                  title="Resultado"
                  value={formatMoney(data.resumo.resultado)}
                  hint={`Física ${formatMoney(data.resumo.fisica)} · Online ${formatMoney(data.resumo.online)}`}
                  icon={<AssessmentRoundedIcon />}
                  color="#8fb4d4"
                />
              </Grid>
            </Grid>
          ) : null}

          {data && tipo === "mensal" ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                  Formas de pagamento
                </Typography>
                <Grid container spacing={2}>
                  {(
                    [
                      ["Dinheiro", data.resumo.pagamentos.dinheiro],
                      ["PIX", data.resumo.pagamentos.pix],
                      ["Débito", data.resumo.pagamentos.debito],
                      ["Crédito", data.resumo.pagamentos.credito],
                      ["A receber", data.resumo.pagamentos.fiado ?? 0],
                    ] as const
                  ).map(([label, valor]) => (
                    <Grid key={label} size={{ xs: 6, sm: 4, md: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h6">{formatMoney(valor)}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          ) : null}

          {showVendas ? (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <PointOfSaleRoundedIcon color="primary" />
                  <Typography variant="h6">Vendas do período</Typography>
                </Stack>
                <DataGrid
                  autoHeight
                  density="compact"
                  rows={data.vendas}
                  columns={vendasCols}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{ border: 0, minWidth: 0 }}
                />
              </CardContent>
            </Card>
          ) : null}

          {showProdutos ? (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <Inventory2RoundedIcon color="primary" />
                  <Typography variant="h6">Produtos mais vendidos</Typography>
                </Stack>
                <DataGrid
                  autoHeight
                  rows={data.topProdutos}
                  columns={produtosCols}
                  pageSizeOptions={[10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </CardContent>
            </Card>
          ) : null}

          {showClientes ? (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <GroupsRoundedIcon color="primary" />
                  <Typography variant="h6">Faturamento por cliente</Typography>
                </Stack>
                <DataGrid
                  autoHeight
                  rows={data.clientes}
                  columns={clientesCols}
                  pageSizeOptions={[10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </CardContent>
            </Card>
          ) : null}

          {showCompras ? (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <ShoppingCartRoundedIcon color="primary" />
                  <Typography variant="h6">Compras do período</Typography>
                </Stack>
                <DataGrid
                  autoHeight
                  rows={data.compras}
                  columns={comprasCols}
                  pageSizeOptions={[10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .relatorios-print-root, .relatorios-print-root * { visibility: visible !important; }
          .relatorios-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </Box>
  );
}
