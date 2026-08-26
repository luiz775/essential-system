import { useEffect, useRef, useState } from "react";
import {
  BrowserCodeReader,
  BrowserMultiFormatReader,
  BrowserMultiFormatOneDReader,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";
import { Camera, ImagePlus, RotateCw, ScanBarcode, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => { ok: boolean; message: string };
  title?: string;
  hint?: string;
};

const DEVICE_KEY = "essential-camera-id";
const ROTATION_KEY = "essential-camera-rotation";

function buildHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.QR_CODE,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

function looksLikeBarcode(code: string) {
  const cleaned = code.trim();
  if (cleaned.length < 6 || cleaned.length > 48) return false;
  if (/^\d{8,14}$/.test(cleaned)) return true;
  if (/^[A-Za-z0-9\-_.\/+]{6,32}$/.test(cleaned)) return true;
  return false;
}

function scoreDevice(label: string) {
  const name = label.toLowerCase();
  if (/droidcam|ivcam|iphone|android|obs|virtual|iriun|epoccam/.test(name)) return 100;
  if (/back|rear|traseira|environment/.test(name)) return 60;
  if (/front|user|integrated|webcam/.test(name)) return 10;
  return 30;
}

function pickPreferredId(devices: MediaDeviceInfo[], current?: string) {
  if (current && devices.some((d) => d.deviceId === current)) return current;
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved && devices.some((d) => d.deviceId === saved)) return saved;
  const ranked = [...devices].sort(
    (a, b) => scoreDevice(b.label) - scoreDevice(a.label)
  );
  return ranked[0]?.deviceId ?? "";
}

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title = "Código de barras",
  hint = "Escolha a câmera DroidCam no seletor abaixo e aponte para o código.",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onScanRef = useRef(onScan);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pendingRef = useRef<{ code: string; hits: number }>({ code: "", hits: 0 });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [decodingPhoto, setDecodingPhoto] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [rotation, setRotation] = useState(() => {
    const saved = Number(localStorage.getItem(ROTATION_KEY) ?? "90");
    return [0, 90, 180, 270].includes(saved) ? saved : 90;
  });
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  onScanRef.current = onScan;

  function applyCode(code: string) {
    const cleaned = code.trim();
    if (!cleaned || !looksLikeBarcode(cleaned)) return;

    if (pendingRef.current.code === cleaned) {
      pendingRef.current.hits += 1;
    } else {
      pendingRef.current = { code: cleaned, hits: 1 };
      setFeedback("Segure o código… confirmando leitura");
      return;
    }
    if (pendingRef.current.hits < 2) return;

    const now = Date.now();
    if (lastRef.current.code === cleaned && now - lastRef.current.at < 2500) {
      return;
    }
    lastRef.current = { code: cleaned, at: now };
    pendingRef.current = { code: "", hits: 0 };
    const outcome = onScanRef.current(cleaned);
    setFeedback(outcome.message);
    if (outcome.ok && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatOneDReader(buildHints());
    let scanTimer: number | undefined;

    async function stop() {
      if (scanTimer) window.clearInterval(scanTimer);
      scanTimer = undefined;
      try {
        controlsRef.current?.stop();
      } catch {
        /* ignore */
      }
      controlsRef.current = null;
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    }

    async function listCameras() {
      const list = await BrowserCodeReader.listVideoInputDevices();
      if (cancelled) return [] as MediaDeviceInfo[];
      setDevices(list);
      return list;
    }

    async function startCamera() {
      setStarting(true);
      setCameraReady(false);
      setError(null);
      setFeedback(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Este navegador não permite câmera. Use Chrome atualizado ou “Foto do código”."
        );
        setStarting(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 80));
      if (cancelled || !videoRef.current) {
        setStarting(false);
        return;
      }

      try {
        let list = await listCameras();
        if (!list.length) {
          const probe = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          probe.getTracks().forEach((t) => t.stop());
          list = await listCameras();
        }
        if (!list.length) {
          setError(
            "Nenhuma câmera encontrada. Abra o DroidCam no PC, confirme a imagem no app e tente de novo."
          );
          setStarting(false);
          return;
        }

        const chosen = pickPreferredId(list, deviceId);
        if (chosen && chosen !== deviceId) {
          setDeviceId(chosen);
          localStorage.setItem(DEVICE_KEY, chosen);
        }
        const idToUse = chosen || deviceId;
        if (idToUse) localStorage.setItem(DEVICE_KEY, idToUse);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: idToUse
            ? { deviceId: { exact: idToUse } }
            : true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);

        scanTimer = window.setInterval(() => {
          if (cancelled || video.readyState < 2) return;
          try {
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h) return;
            const deg = rotationRef.current;
            const swapped = deg === 90 || deg === 270;
            const canvas = document.createElement("canvas");
            canvas.width = swapped ? h : w;
            canvas.height = swapped ? w : h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((deg * Math.PI) / 180);
            ctx.drawImage(video, -w / 2, -h / 2, w, h);
            const result = reader.decodeFromCanvas(canvas);
            if (result) applyCode(result.getText());
          } catch {
            /* frame sem código */
          }
        }, 350);

        setCameraReady(true);
        setStarting(false);
      } catch (err) {
        if (cancelled) return;
        await stop();
        const msg =
          err instanceof DOMException
            ? `${err.name}${err.message ? `: ${err.message}` : ""}`
            : err instanceof Error
              ? err.message
              : "Não foi possível abrir a câmera.";

        if (/NotAllowed|Permission|denied/i.test(msg)) {
          setError(
            "Câmera bloqueada no Chrome. Clique no cadeado ao lado do endereço → Câmera → Permitir. Depois escolha DroidCam no seletor."
          );
        } else if (/NotFound|Overconstrained|DevicesNotFound/i.test(msg)) {
          setError(
            "Essa câmera não está disponível. No seletor, escolha “DroidCam Source” (não a webcam do notebook)."
          );
        } else if (/NotReadable|TrackStart|Abort/i.test(msg)) {
          setError(
            "A câmera está em uso. Feche Zoom/Teams/Câmera do Windows e deixe só o DroidCam aberto."
          );
        } else {
          setError(
            `${msg} — escolha DroidCam no seletor ou use “Foto do código”.`
          );
        }
        setStarting(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      void stop();
    };
    // deviceId no deps: troca de câmera reinicia o leitor
  }, [open, deviceId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function decodeBlob(file: Blob) {
    const url = URL.createObjectURL(file);
    try {
      const oneD = new BrowserMultiFormatOneDReader(buildHints());
      try {
        const result = await oneD.decodeFromImageUrl(url);
        applyCode(result.getText());
        return;
      } catch {
        /* try multi */
      }
      const multi = new BrowserMultiFormatReader(buildHints());
      const result = await multi.decodeFromImageUrl(url);
      applyCode(result.getText());
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setDecodingPhoto(true);
    setFeedback(null);
    setError(null);
    try {
      await decodeBlob(file);
    } catch {
      setError(
        "Não consegui ler o código nessa foto. Tente de novo: luz boa, código reto, sem reflexo."
      );
    } finally {
      setDecodingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4">
      <div className="flex max-h-[96dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-panel sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-gold">
            <ScanBarcode size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Leitor</p>
              <h2 className="font-serif text-2xl text-cream">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 text-sand/70 touch-manipulation"
            aria-label="Fechar leitor"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative overflow-hidden bg-black">
          <div
            className="flex aspect-video w-full items-center justify-center"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <video
              ref={videoRef}
              className={`bg-black object-contain ${
                rotation === 90 || rotation === 270
                  ? "h-[100%] max-h-none w-auto max-w-none"
                  : "h-full w-full"
              }`}
              muted
              playsInline
              autoPlay
            />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-[78%] rounded-2xl border-2 border-gold/70" />
          </div>
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-sand/80">
              Abrindo câmera…
            </div>
          )}
          {cameraReady && !error && (
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-emerald-200">
              <Camera size={12} />
              Câmera ativa
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setRotation((prev) => {
                const next = (prev + 90) % 360;
                localStorage.setItem(ROTATION_KEY, String(next));
                return next;
              });
            }}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-cream touch-manipulation"
          >
            <RotateCw size={14} />
            Girar
          </button>
        </div>

        <div className="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {devices.length > 0 && (
            <label className="block text-sm text-sand/80">
              Câmera
              <select
                value={deviceId}
                onChange={(e) => {
                  localStorage.setItem(DEVICE_KEY, e.target.value);
                  setDeviceId(e.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-gold/30 bg-panel-2 px-3 py-2.5 text-sm text-cream outline-none"
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Câmera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : (
            <p className="text-sm text-sand/70">{hint}</p>
          )}
          {feedback && (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
                feedback.startsWith("✓")
                  ? "border border-emerald-400/30 bg-emerald-950/30 text-emerald-200"
                  : "border border-amber-400/30 bg-amber-950/30 text-amber-100"
              }`}
            >
              {feedback}
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            disabled={decodingPhoto}
            onClick={() => fileRef.current?.click()}
            className="btn-gold inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold px-4 text-sm font-medium text-ink touch-manipulation disabled:opacity-50"
          >
            <ImagePlus size={18} />
            {decodingPhoto ? "Lendo foto…" : "Foto do código"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-full border border-white/15 px-4 py-2.5 text-sm touch-manipulation"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
