import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

if (process.env.DATABASE_URL?.startsWith("file:")) {
  const relative = process.env.DATABASE_URL.replace(/^file:/, "").replace(/^\.\//, "");
  const absolute = path.isAbsolute(relative)
    ? relative
    : path.join(rootDir, "prisma", relative);
  process.env.DATABASE_URL = `file:${absolute.replace(/\\/g, "/")}`;
}

export { rootDir };
