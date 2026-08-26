import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUCKET_FOTOS, supabase } from "../lib/supabase.js";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const uploadsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads"
);

export function extFromMime(mime: string) {
  return MIME_EXT[mime] ?? "jpg";
}

function publicApiUrl() {
  return process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
}

export async function uploadProdutoFoto(file: Express.Multer.File): Promise<string> {
  const ext = extFromMime(file.mimetype);
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) {
      throw new Error(`Falha no upload: ${error.message}`);
    }
    const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(filename);
    return data.publicUrl;
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), file.buffer);
  return `${publicApiUrl()}/uploads/${filename}`;
}

export function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/object/public/${BUCKET_FOTOS}/`;
  const index = url.indexOf(marker);
  if (index !== -1) {
    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  }
  const localMarker = "/uploads/";
  const localIndex = url.lastIndexOf(localMarker);
  if (localIndex !== -1) {
    return url.slice(localIndex + localMarker.length).split("?")[0];
  }
  return null;
}

export async function deleteProdutoFoto(fotoUrl: string | null | undefined) {
  if (!fotoUrl) return;
  const storedPath = storagePathFromPublicUrl(fotoUrl);
  if (!storedPath) return;

  if (supabase && fotoUrl.includes("/object/public/")) {
    await supabase.storage.from(BUCKET_FOTOS).remove([storedPath]);
    return;
  }

  await fs.unlink(path.join(uploadsDir, storedPath)).catch(() => undefined);
}

export { uploadsDir };
