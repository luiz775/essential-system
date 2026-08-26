export type Produto = {
  id: string;
  nome: string;
  marca: string;
  familia: string;
  volumeMl: number;
  sku: string | null;
  codigoBarras: string | null;
  descricao: string | null;
  precoCusto: string;
  precoVenda: string;
  estoque: number;
  estoqueMin: number;
  fotoUrl: string | null;
  ativo: boolean;
};

export type Pagamento = {
  id: string;
  metodo: "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "FIADO";
  valor: string;
  recebido: string | null;
  troco: string | null;
  parcelas: number | null;
};

export type ItemVenda = {
  id: string;
  quantidade: number;
  precoUnitario: string;
  produto: Produto;
};

export type Venda = {
  id: string;
  subtotal: string;
  descontoTipo: string;
  descontoInput: string;
  descontoValor: string;
  total: string;
  frete?: string;
  status: string;
  origem?: string;
  createdAt: string;
  canceladaEm: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteWhatsapp?: string | null;
  clienteEmail?: string | null;
  cliente?: { id: string; nome: string; whatsapp?: string | null } | null;
  tipoEntrega?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  complemento?: string | null;
  observacao?: string | null;
  itens: ItemVenda[];
  pagamentos: Pagamento[];
};

export type LicencaStatus = {
  configurada: boolean;
  bloqueada: boolean;
  emTolerancia: boolean;
  diasRestantes: number;
  vencimento: string | null;
  pixChave: string;
  pixNome: string;
  lojaNome: string;
  toleranciaDias: number;
  mensalidadePixChave: string;
  mensalidadePixNome: string;
  exigeChaveMestre: boolean;
};

export type ResumoCaixa = {
  fundoInicial: number;
  sangrias: number;
  suprimentos: number;
  gavetaEsperada: number;
  quantidadeVendas: number;
  lucro?: number;
  compras?: { total: number; quantidade: number };
  despesas?: { total: number; quantidade: number };
  movimentos?: {
    id: string;
    tipo: "VENDA" | "COMPRA" | "SANGRIA" | "SUPRIMENTO";
    descricao: string;
    entrada: number;
    saida: number;
    hora: string;
  }[];
  totaisMovimento?: { entrada: number; saida: number };
  totais: {
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    vendas: number;
  };
  caixa?: Caixa;
};

export type CaixaHistorico = {
  mes: string;
  caixas: {
    id: string;
    abertoEm: string;
    fechadoEm: string | null;
    status: string;
    fundoInicial: number;
    compras: number;
    despesas: number;
    vendas: number;
    saldo: number;
    lucro: number;
  }[];
  lucro7Dias: { label: string; lucro: number }[];
};

export type Caixa = {
  id: string;
  fundoInicial: string;
  status: string;
  abertoEm: string;
  fechadoEm: string | null;
};

const API = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "es_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/api/auth/login")) {
    setAuthToken(null);
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
  if (!response.ok) {
    throw new Error(data.error || "Falha na requisição.");
  }
  return data as T;
}

export type Operador = {
  id: string;
  nome: string;
  usuario: string;
  role: string;
};

export function loginOperador(usuario: string, senha: string) {
  return request<{ token: string; operador: Operador; expiresAt: string }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });
}

export function obterSessao() {
  return request<{ operador: Operador }>("/api/auth/me");
}

export function logoutOperador() {
  return request<undefined>("/api/auth/logout", { method: "POST" });
}

export function listarProdutos() {
  return request<Produto[]>("/api/produtos");
}

export function obterProduto(id: string) {
  return request<Produto>(`/api/produtos/${id}`);
}

export function salvarProduto(form: FormData, id?: string) {
  return request<Produto>(id ? `/api/produtos/${id}` : "/api/produtos", {
    method: id ? "PUT" : "POST",
    body: form,
  });
}

export function excluirProduto(id: string) {
  return request<{ message?: string } | undefined>(`/api/produtos/${id}`, {
    method: "DELETE",
  });
}

export function ajustarEstoque(
  id: string,
  payload: { tipo: "ENTRADA" | "PERDA"; quantidade: number; motivo?: string }
) {
  return request<Produto>(`/api/produtos/${id}/ajuste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listarVendas(origem?: string) {
  const q = origem ? `?origem=${origem}` : "";
  return request<Venda[]>(`/api/vendas${q}`);
}

export function obterVenda(id: string) {
  return request<Venda>(`/api/vendas/${id}`);
}

export function finalizarVenda(payload: {
  itens: { produtoId: string; quantidade: number }[];
  descontoTipo: "VALOR" | "PERCENTUAL";
  descontoInput: number;
  origem: "PDV" | "ONLINE";
  clienteId?: string | null;
  pagamentos: {
    metodo: string;
    valor: number;
    recebido?: number;
    parcelas?: number;
  }[];
}) {
  return request<Venda>("/api/vendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function cancelarVenda(id: string) {
  return request<Venda>(`/api/vendas/${id}/cancelar`, { method: "POST" });
}

export function obterLicenca() {
  return request<LicencaStatus>("/api/licenca");
}

export function renovarLicenca(meses = 1, chaveMestre?: string) {
  return request<LicencaStatus>("/api/licenca/renovar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meses, chaveMestre: chaveMestre || undefined }),
  });
}

export function obterCaixaAtual() {
  return request<{ caixa: Caixa | null; resumo: ResumoCaixa | null }>("/api/caixa/atual");
}

export function abrirCaixa(fundoInicial: number) {
  return request<Caixa>("/api/caixa/abrir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fundoInicial }),
  });
}

export function movimentoCaixa(payload: {
  tipo: "SANGRIA" | "SUPRIMENTO";
  valor: number;
  motivo?: string;
}) {
  return request<{ resumo: ResumoCaixa }>("/api/caixa/movimento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fecharCaixa() {
  return request<{ caixa: Caixa; resumo: ResumoCaixa }>("/api/caixa/fechar", {
    method: "POST",
  });
}

export function historicoCaixa(mes?: string) {
  const q = mes ? `?mes=${encodeURIComponent(mes)}` : "";
  return request<CaixaHistorico>(`/api/caixa/historico${q}`);
}

export function maisVendidos() {
  return request<{
    ranking: { produto: Produto; quantidade: number; faturamento: number }[];
  }>("/api/relatorios/mais-vendidos");
}

export type PainelResumo = {
  faturamento: number;
  lucro: number;
  tickets: number;
  unidades: number;
  fisica: number;
  online: number;
  pagamentos: {
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    fiado: number;
  };
};

export type Painel = {
  caixa: {
    aberto: boolean;
    fundoInicial: number;
    gavetaEsperada: number;
    quantidadeVendas: number;
    abertoEm: string;
  } | null;
  hoje: PainelResumo & {
    vsOntem: { faturamento: number; lucro: number };
  };
  mes: PainelResumo & {
    produtosAtivos: number;
    estoqueBaixo: number;
  };
  estoqueBaixo: {
    id: string;
    nome: string;
    marca: string;
    estoque: number;
    estoqueMin: number;
    fotoUrl: string | null;
  }[];
  topProdutos: {
    id: string;
    nome: string;
    marca: string;
    fotoUrl: string | null;
    quantidade: number;
    faturamento: number;
  }[];
  lucro6Meses: { label: string; lucro: number; faturamento: number }[];
  series30d: {
    label: string;
    faturamento: number;
    lucro: number;
    tickets: number;
    fisica: number;
    online: number;
  }[];
  vendasHoje: {
    id: string;
    createdAt: string;
    origem: string;
    total: number;
    itens: string;
    pagamento: string;
  }[];
  vendasRecentes: {
    id: string;
    createdAt: string;
    origem: string;
    total: number;
    itens: string;
    pagamento: string;
  }[];
};

export function obterPainel() {
  return request<Painel>("/api/relatorios/painel");
}

export type RelatorioTipo =
  | "mensal"
  | "vendas"
  | "produtos"
  | "clientes"
  | "compras";

export type RelatorioGerencial = {
  tipo: RelatorioTipo;
  ano: number;
  mes: number;
  label: string;
  from: string;
  to: string;
  resumo: PainelResumo & {
    compras: number;
    despesas: number;
    resultado: number;
  };
  topProdutos: {
    id: string;
    nome: string;
    marca: string;
    quantidade: number;
    faturamento: number;
  }[];
  clientes: {
    id: string;
    nome: string;
    documento: string | null;
    tipo: string;
    vendasCount: number;
    totalVendido: number;
  }[];
  vendas: {
    id: string;
    createdAt: string;
    origem: string;
    clienteNome: string | null;
    total: number;
    itens: string;
    pagamento: string;
  }[];
  compras: {
    id: string;
    createdAt: string;
    produto: string;
    marca: string;
    fornecedor: string;
    quantidade: number;
    total: number;
  }[];
};

export function obterRelatorioGerencial(params: {
  tipo: RelatorioTipo;
  ano: number;
  mes: number;
}) {
  const q = new URLSearchParams({
    tipo: params.tipo,
    ano: String(params.ano),
    mes: String(params.mes),
  });
  return request<RelatorioGerencial>(`/api/relatorios/gerencial?${q}`);
}

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string | null;
  telefone: string | null;
  whatsapp?: string | null;
  email: string | null;
  produtosDescricao?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacao?: string | null;
  ativo: boolean;
  createdAt?: string;
  comprasCount?: number;
  totalComprado?: number;
  comprasMes?: number;
  ultimaCompra?: string | null;
};

export type FornecedoresPainel = {
  resumo: {
    total: number;
    ativos: number;
    totalComprado: number;
    comprasMes: number;
    maiorFornecedor: { id: string; nome: string; total: number } | null;
  };
  fornecedores: Fornecedor[];
};

export function listarFornecedores() {
  return request<Fornecedor[]>("/api/fornecedores/simples");
}

export function obterFornecedoresPainel() {
  return request<FornecedoresPainel>("/api/fornecedores");
}

export function salvarFornecedor(
  payload: {
    nome: string;
    cnpj?: string;
    telefone?: string;
    whatsapp?: string;
    email?: string;
    produtosDescricao?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    observacao?: string;
    ativo?: boolean;
  },
  id?: string
) {
  return request<Fornecedor>(id ? `/api/fornecedores/${id}` : "/api/fornecedores", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function excluirFornecedor(id: string) {
  return request<{ message?: string } | undefined>(`/api/fornecedores/${id}`, {
    method: "DELETE",
  });
}

export function criarFornecedor(nome: string) {
  return salvarFornecedor({ nome });
}

export type Cliente = {
  id: string;
  nome: string;
  documento?: string | null;
  tipo: "VAREJO" | "ATACADO" | string;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  produtosDescricao?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacao?: string | null;
  ativo: boolean;
  createdAt?: string;
  vendasCount?: number;
  totalVendido?: number;
  vendasMes?: number;
  ultimaVenda?: string | null;
};

export type ClientesPainel = {
  resumo: {
    total: number;
    ativos: number;
    totalVendido: number;
    vendasMes: number;
    maiorCliente: { id: string; nome: string; total: number } | null;
  };
  clientes: Cliente[];
};

export function obterClientesPainel() {
  return request<ClientesPainel>("/api/clientes");
}

export function listarClientes() {
  return request<Cliente[]>("/api/clientes/simples");
}

export function salvarCliente(
  payload: {
    nome: string;
    documento?: string;
    tipo?: string;
    telefone?: string;
    whatsapp?: string;
    email?: string;
    produtosDescricao?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    observacao?: string;
    ativo?: boolean;
  },
  id?: string
) {
  return request<Cliente>(id ? `/api/clientes/${id}` : "/api/clientes", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function excluirCliente(id: string) {
  return request<{ message?: string } | undefined>(`/api/clientes/${id}`, {
    method: "DELETE",
  });
}

export type CompraRow = {
  id: string;
  createdAt: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  precoVendaRef: number;
  totalCompra: number;
  vendaEstimada: number;
  lucroEstimado: number;
  observacao: string | null;
  produto: { id: string; nome: string; marca: string };
  fornecedor: { id: string; nome: string } | null;
};

export type ComprasPainel = {
  from: string;
  to: string;
  resumo: {
    totalComprado: number;
    vendaEstimada: number;
    lucroEstimado: number;
    ticketMedio: number;
    lancamentos: number;
  };
  volumePorProduto: { id: string; nome: string; total: number; quantidade: number }[];
  compras: CompraRow[];
};

export function listarCompras(params?: {
  from?: string;
  to?: string;
  produtoId?: string;
  fornecedorId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.produtoId) q.set("produtoId", params.produtoId);
  if (params?.fornecedorId) q.set("fornecedorId", params.fornecedorId);
  const qs = q.toString();
  return request<ComprasPainel>(`/api/compras${qs ? `?${qs}` : ""}`);
}

export function criarCompra(payload: {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
  unidade?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  observacao?: string;
  data?: string;
}) {
  return request<CompraRow>("/api/compras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function excluirCompra(id: string) {
  return request<undefined>(`/api/compras/${id}`, { method: "DELETE" });
}

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export const METODO_LABEL: Record<Pagamento["metodo"], string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Cartão débito",
  CREDITO: "Cartão crédito",
  FIADO: "A receber",
};

export type ContaReceber = {
  id: string;
  clienteId: string;
  vendaId: string | null;
  descricao: string | null;
  valor: number;
  pago: number;
  saldo: number;
  vencida: boolean;
  vencimento: string | null;
  status: "ABERTA" | "PARCIAL" | "PAGA" | "CANCELADA" | string;
  createdAt: string;
  cliente: { id: string; nome: string; whatsapp?: string | null; documento?: string | null };
  venda: { id: string; createdAt: string; total: string; origem: string } | null;
  recebimentos: {
    id: string;
    valor: string;
    metodo: string;
    observacao: string | null;
    createdAt: string;
  }[];
};

export type ContasReceberPainel = {
  resumo: {
    aReceber: number;
    quantidadeAbertas: number;
    atrasadas: number;
    recebidosMes: number;
  };
  contas: ContaReceber[];
};

export function listarContasReceber(status?: "abertas" | "pagas" | "todas") {
  const q = status ? `?status=${status}` : "";
  return request<ContasReceberPainel>(`/api/contas-receber${q}`);
}

export function receberConta(
  id: string,
  payload: { valor: number; metodo: string; observacao?: string }
) {
  return request<ContaReceber>(`/api/contas-receber/${id}/receber`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
