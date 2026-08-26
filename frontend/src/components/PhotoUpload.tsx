import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  currentUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent: () => void;
  removed: boolean;
};

export function PhotoUpload({
  currentUrl,
  file,
  onFileChange,
  onRemoveCurrent,
  removed,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const preview = file ? URL.createObjectURL(file) : removed ? null : currentUrl;

  const applyFile = useCallback(
    (next: File | null) => {
      setError(null);
      if (!next) {
        onFileChange(null);
        return;
      }
      if (!ALLOWED.includes(next.type)) {
        setError("Use JPG, PNG ou WEBP.");
        return;
      }
      if (next.size > MAX_BYTES) {
        setError("A imagem deve ter no máximo 2 MB.");
        return;
      }
      onFileChange(next);
    },
    [onFileChange]
  );

  function onSelect(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-2xl border border-dashed transition ${
          dragging
            ? "border-gold bg-gold/10"
            : "border-gold/35 bg-ink-soft/60"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-56 w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center"
        >
          {preview ? (
            <img
              src={preview}
              alt="Prévia da foto"
              className="h-52 w-full rounded-xl object-cover"
            />
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                <ImagePlus size={22} />
              </span>
              <div>
                <p className="font-medium text-cream">Arraste a foto do perfume</p>
                <p className="mt-1 text-sm text-sand/70">
                  ou clique para selecionar · JPG, PNG, WEBP · até 2 MB
                </p>
              </div>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onSelect}
        />
      </div>

      {(preview || file) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-gold/40 px-4 py-2 text-sm text-cream hover:bg-gold/10"
          >
            Alterar foto
          </button>
          <button
            type="button"
            onClick={() => {
              onFileChange(null);
              onRemoveCurrent();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Remover
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
