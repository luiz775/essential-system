import { FlaskConical } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
};

export function ProductPhoto({ src, alt, className = "", iconSize = 28 }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-ink-soft to-panel-2 ${className}`}
      aria-label="Sem foto"
    >
      <div className="flex flex-col items-center gap-1 text-gold/70">
        <FlaskConical size={iconSize} strokeWidth={1.4} />
      </div>
    </div>
  );
}
