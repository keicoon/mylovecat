import { CSSProperties } from "react";

export function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" style={{ "--segments": options.length } as CSSProperties}>
      {options.map((option) => (
        <button
          className={Object.is(value, option.value) ? "is-active" : ""}
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
