import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { obterLicenca, renovarLicenca, type LicencaStatus } from "../lib/api";
import { pixQrUrl } from "../lib/pix";

function formatVencimento(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function MensalidadePage() {
  const navigate = useNavigate();
  const [licenca, setLicenca] = useState<LicencaStatus | null>(null);
  const [chaveMestre, setChaveMestre] = useState("");
  const [meses, setMeses] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    obterLicenca()
      .then(setLicenca)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar."));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!licenca) return;
    setBusy(true);
    setError(null);
    try {
      const atual = await renovarLicenca(Number(meses) || 1, chaveMestre.trim() || undefined);
      setLicenca(atual);
      setChaveMestre("");
      if (!atual.bloqueada) navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível renovar.");
    } finally {
      setBusy(false);
    }
  }

  if (!licenca) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography>Carregando…</Typography>;
  }

  const status = licenca.bloqueada
    ? "Bloqueada"
    : licenca.emTolerancia
      ? "Em tolerância"
      : licenca.diasRestantes <= 7
        ? `Ativa · ${licenca.diasRestantes} dia(s)`
        : "Ativa";

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <div>
        <Typography variant="overline" sx={{ letterSpacing: "0.2em", color: "primary.main" }}>
          Assinatura
        </Typography>
        <Typography variant="h4">Mensalidade</Typography>
      </div>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Vence em
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {formatVencimento(licenca.vencimento)}
          </Typography>
          <Typography sx={{ mt: 1 }}>{status}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Depois do vencimento, o cliente ainda usa o sistema por {licenca.toleranciaDias} dias.
            Acabou a tolerância, o PDV trava até você confirmar o pagamento.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <img
            src={pixQrUrl(licenca.mensalidadePixChave, { nome: licenca.mensalidadePixNome })}
            alt="QR PIX mensalidade"
            width={120}
            height={120}
            style={{ borderRadius: 12, background: "#fff", padding: 4 }}
          />
          <div>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              PIX da mensalidade
            </Typography>
            <Typography fontWeight={600}>{licenca.mensalidadePixNome}</Typography>
            <Typography fontFamily="ui-monospace, monospace">{licenca.mensalidadePixChave}</Typography>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Liberar mês
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {licenca.exigeChaveMestre
              ? "Use a chave mestra (só você). O operador da loja não consegue liberar sozinho."
              : "Neste servidor não há chave mestra: o ADMIN da loja pode renovar. Para vender o sistema, coloque LICENCA_MASTER_KEY no .env."}
          </Typography>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              {licenca.exigeChaveMestre ? (
                <TextField
                  label="Chave de liberação"
                  type="password"
                  value={chaveMestre}
                  onChange={(ev) => setChaveMestre(ev.target.value)}
                  autoComplete="off"
                  required
                />
              ) : null}
              <TextField
                label="Meses pagos"
                type="number"
                value={meses}
                onChange={(ev) => setMeses(ev.target.value)}
                slotProps={{ htmlInput: { min: 1, max: 12 } }}
              />
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? "Liberando…" : "Confirmar pagamento"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
