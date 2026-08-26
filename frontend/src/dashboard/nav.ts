import type { SvgIconComponent } from "@mui/icons-material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";

export const DRAWER_WIDTH = 240;
export const DRAWER_COLLAPSED_WIDTH = 80;

export type NavItem = {
  to: string;
  label: string;
  icon: SvgIconComponent;
  end?: boolean;
};

export const mainNavItems: NavItem[] = [
  { to: "/", label: "Painel", icon: DashboardRoundedIcon, end: true },
  { to: "/vendas", label: "Vendas", icon: PointOfSaleRoundedIcon },
  { to: "/estoque", label: "Produtos", icon: Inventory2RoundedIcon },
  { to: "/compras", label: "Compras", icon: ShoppingCartRoundedIcon },
  { to: "/fornecedores", label: "Fornecedores", icon: LocalShippingRoundedIcon },
  { to: "/clientes", label: "Clientes", icon: GroupsRoundedIcon },
  { to: "/contas-receber", label: "A receber", icon: PaymentsRoundedIcon },
  { to: "/caixa", label: "Caixa", icon: AccountBalanceWalletRoundedIcon },
  { to: "/historico", label: "Histórico", icon: HistoryRoundedIcon },
  { to: "/relatorios", label: "Relatórios", icon: AssessmentRoundedIcon },
  { to: "/mensalidade", label: "Mensalidade", icon: VerifiedUserRoundedIcon },
];
