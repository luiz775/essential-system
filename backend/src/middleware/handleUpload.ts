import type { NextFunction, Request, Response } from "express";
import { uploadFoto } from "./upload.js";

export function handleFotoUpload(req: Request, res: Response, next: NextFunction) {
  uploadFoto.single("foto")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const err = error as { message?: string; code?: string };
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "A foto deve ter no máximo 2 MB." });
      return;
    }
    res.status(400).json({ error: err.message || "Arquivo inválido." });
  });
}
