import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

export function Select({
  value,
  options,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 160, maxHeight: 240 });

  const selected = options.find((option) => option.value === value) ?? options[0];

  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxHeight = 260;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp = spaceBelow < 160 && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(12, rect.top - Math.min(maxHeight, options.length * 42) - gap)
      : rect.bottom + gap;
    setPos({
      top,
      left: rect.left,
      width: Math.max(rect.width, 112),
      maxHeight: openUp
        ? Math.min(maxHeight, rect.top - 16)
        : Math.min(maxHeight, window.innerHeight - rect.bottom - 16),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    function update() {
      place();
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 text-left text-cream outline-none transition hover:border-gold/50 ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gold transition duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className="fixed z-[80] overflow-y-auto rounded-2xl border border-gold/35 bg-panel-2 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full px-4 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-gold/18 text-gold"
                      : "text-cream hover:bg-gold/10 hover:text-gold"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
