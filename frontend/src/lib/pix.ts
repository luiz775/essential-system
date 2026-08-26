type PixQrOptions = {
  nome?: string;
  cidade?: string;
  valor?: number;
};

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function pixAscii(text: string, max: number, fallback: string) {
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .toUpperCase();
  return clean || fallback;
}

/** Telefone PIX exige +55. CPF/CNPJ/e-mail/EVP ficam como estão. */
export function normalizePixKey(raw: string) {
  const chave = raw.trim();
  if (!chave) return "";
  if (chave.includes("@")) return chave.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) {
    return chave.toLowerCase();
  }

  const digits = chave.replace(/\D/g, "");
  if (digits.length === 14) return digits;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 11 && digits[2] === "9") return `+55${digits}`;
  if (digits.length === 11) return digits;
  if (digits.length === 10) return `+55${digits}`;
  return chave;
}

export function buildPixPayload(chave: string, options: PixQrOptions = {}) {
  const key = normalizePixKey(chave);
  if (!key) return "";

  const valor =
    options.valor != null && options.valor > 0 ? options.valor.toFixed(2) : "";

  const merchant = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", key));
  const campos = [
    tlv("00", "01"),
    tlv("01", "11"),
    merchant,
    tlv("52", "0000"),
    tlv("53", "986"),
    valor ? tlv("54", valor) : "",
    tlv("58", "BR"),
    tlv("59", pixAscii(options.nome ?? "", 25, "ESSENTIAL SYSTEM")),
    tlv("60", pixAscii(options.cidade ?? "", 15, "CAMPO GRANDE")),
    tlv("62", tlv("05", "***")),
  ].join("");

  const comCrc = `${campos}6304`;
  return comCrc + crc16(comCrc);
}

export function pixQrUrl(chave: string, options: PixQrOptions = {}) {
  const payload = buildPixPayload(chave, options);
  if (!payload) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(payload)}`;
}
