import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatMoney, type Painel } from "../lib/api";

const columns: GridColDef[] = [
  {
    field: "createdAt",
    headerName: "Data",
    flex: 0.8,
    minWidth: 140,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleString("pt-BR"),
  },
  { field: "itens", headerName: "Itens", flex: 1.4, minWidth: 180 },
  {
    field: "origem",
    headerName: "Origem",
    width: 110,
    valueGetter: (_value, row) => (row.origem === "ONLINE" ? "Online" : "Física"),
  },
  { field: "pagamento", headerName: "Pagamento", width: 150 },
  {
    field: "total",
    headerName: "Total",
    width: 120,
    valueGetter: (_value, row) => formatMoney(row.total),
  },
];

export function VendasDataGrid({ rows }: { rows: Painel["vendasRecentes"] }) {
  return (
    <DataGrid
      autoHeight
      rows={rows}
      columns={columns}
      density="compact"
      pageSizeOptions={[5, 10]}
      initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
      disableRowSelectionOnClick
      localeText={{
        noRowsLabel: "Nenhuma venda neste mês",
      }}
      sx={{
        borderColor: "rgba(196, 165, 116, 0.22)",
        width: "100%",
        overflowX: "auto",
        "& .MuiDataGrid-cell": { borderColor: "rgba(255,255,255,0.06)" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(196,165,116,0.06)" },
      }}
    />
  );
}
