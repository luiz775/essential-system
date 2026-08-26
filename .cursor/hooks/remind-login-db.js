const fs = require("fs");
const os = require("os");
const path = require("path");

const now = new Date();
const local = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

if (local < "2026-08-26") {
  process.stdout.write("{}");
  process.exit(0);
}

const stamp = path.join(os.homedir(), ".cursor", "remind-login-db-20260826");
if (fs.existsSync(stamp)) {
  process.stdout.write("{}");
  process.exit(0);
}

try {
  fs.writeFileSync(stamp, local);
} catch {
  // still remind even if stamp cannot be written
}

process.stdout.write(
  JSON.stringify({
    additional_context:
      "LEMBRETE para Luiz: mexer no login (operadores) e criar/migrar o banco de dados do Essential System. Ele pediu isso em 25/08/2026.",
  })
);
