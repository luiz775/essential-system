import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

type TrackedInput = HTMLInputElement & {
  _valueTracker?: { setValue: (value: string) => void };
};

export function NumberInput({ className = "", onChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const full = /\bw-full\b/.test(className);

  function nudge(direction: 1 | -1) {
    const el = ref.current as TrackedInput | null;
    if (!el || el.disabled || el.readOnly) return;
    try {
      if (direction > 0) el.stepUp();
      else el.stepDown();
    } catch {
      return;
    }
    el._valueTracker?.setValue("");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div
      className={`number-input relative ${full ? "block w-full" : "inline-block align-middle"}`}
    >
      <input
        {...props}
        ref={ref}
        type="number"
        onChange={onChange}
        className={`number-input-field ${className}`.trim()}
      />
      <div className="number-input-spinners">
        <button type="button" tabIndex={-1} aria-label="Aumentar" onClick={() => nudge(1)}>
          <ChevronUp size={12} strokeWidth={2.5} />
        </button>
        <button type="button" tabIndex={-1} aria-label="Diminuir" onClick={() => nudge(-1)}>
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
