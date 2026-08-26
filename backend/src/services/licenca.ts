import { prisma } from "../lib/prisma.js";

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function pixMensalidade(lojaChave: string, lojaNome: string) {
  const chave = process.env.MENSALIDADE_PIX_CHAVE?.trim() || lojaChave;
  const nome = process.env.MENSALIDADE_PIX_NOME?.trim() || lojaNome || "Essential System";
  return { chave, nome };
}

export async function getLicencaStatus() {
  const licenca = await prisma.licenca.findUnique({ where: { id: "unica" } });
  if (!licenca) {
    const pix = pixMensalidade("", "Essential System");
    return {
      configurada: false,
      bloqueada: true,
      emTolerancia: false,
      diasRestantes: 0,
      vencimento: null,
      pixChave: "",
      pixNome: "",
      lojaNome: "Essential System",
      toleranciaDias: 5,
      mensalidadePixChave: pix.chave,
      mensalidadePixNome: pix.nome,
      exigeChaveMestre: Boolean(process.env.LICENCA_MASTER_KEY?.trim()),
    };
  }

  const agora = new Date();
  const limite = addDays(licenca.vencimento, licenca.toleranciaDias);
  const msDia = 1000 * 60 * 60 * 24;
  const diasRestantes = Math.ceil((licenca.vencimento.getTime() - agora.getTime()) / msDia);
  const bloqueada = agora > limite;
  const emTolerancia = !bloqueada && agora > licenca.vencimento;
  const pix = pixMensalidade(licenca.pixChave, licenca.pixNome);

  return {
    configurada: true,
    bloqueada,
    emTolerancia,
    diasRestantes,
    vencimento: licenca.vencimento.toISOString(),
    pixChave: licenca.pixChave,
    pixNome: licenca.pixNome,
    lojaNome: licenca.lojaNome,
    toleranciaDias: licenca.toleranciaDias,
    mensalidadePixChave: pix.chave,
    mensalidadePixNome: pix.nome,
    exigeChaveMestre: Boolean(process.env.LICENCA_MASTER_KEY?.trim()),
  };
}

export async function assertLicencaAtiva() {
  const status = await getLicencaStatus();
  if (status.bloqueada) {
    throw new Error("LICENCA_VENCIDA");
  }
  return status;
}

export function autorizarRenovacao(chaveMestre: string | undefined, role?: string) {
  const master = process.env.LICENCA_MASTER_KEY?.trim();
  if (master) return Boolean(chaveMestre) && chaveMestre === master;
  return role === "ADMIN";
}

export async function renovarLicenca(meses = 1) {
  const qtd = Number.isInteger(meses) && meses > 0 && meses <= 12 ? meses : 1;
  const licenca = await prisma.licenca.findUnique({ where: { id: "unica" } });
  if (!licenca) {
    throw new Error("Licença não configurada.");
  }

  const agora = new Date();
  const base = licenca.vencimento.getTime() > agora.getTime() ? licenca.vencimento : agora;
  await prisma.licenca.update({
    where: { id: "unica" },
    data: { vencimento: addMonths(base, qtd) },
  });
  return getLicencaStatus();
}
