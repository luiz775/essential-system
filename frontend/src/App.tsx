import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Layout } from "./components/Layout";
import { CaixaPage } from "./pages/CaixaPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ContasReceberPage } from "./pages/ContasReceberPage";
import { ComprasPage } from "./pages/ComprasPage";
import { EstoquePage } from "./pages/EstoquePage";
import { FornecedoresPage } from "./pages/FornecedoresPage";
import { HistoricoPage } from "./pages/HistoricoPage";
import { LoginPage } from "./pages/LoginPage";
import { MensalidadePage } from "./pages/MensalidadePage";
import { PdvPage } from "./pages/PdvPage";
import { ProdutoFormPage } from "./pages/ProdutoFormPage";
import { RelatoriosGerenciaisPage } from "./pages/RelatoriosGerenciaisPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RelatoriosPage />} />
          <Route path="/vendas" element={<PdvPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/contas-receber" element={<ContasReceberPage />} />
          <Route path="/produtos/novo" element={<ProdutoFormPage />} />
          <Route path="/produtos/:id" element={<ProdutoFormPage />} />
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/historico" element={<HistoricoPage />} />
          <Route path="/painel" element={<RelatoriosPage />} />
          <Route path="/relatorios" element={<RelatoriosGerenciaisPage />} />
          <Route path="/mensalidade" element={<MensalidadePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
