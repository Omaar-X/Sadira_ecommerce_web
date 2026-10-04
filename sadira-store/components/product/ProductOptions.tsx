"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OptionGroupProps {
  label: string;
  /** Currently selected value, shown next to the label. */
  selectedLabel: string | null;
  error: string | null;
  children: (ids: { labelId: string; errorId: string }) => ReactNode;
}

/** Labelled option group with an inline error tied to it via aria-describedby. */
export function OptionGroup({ label, selectedLabel, error, children }: OptionGroupProps) {
  const labelId = useId();
  const errorId = useId();
  return (
    <div>
      <p id={labelId} className="text-sm text-foreground">
        <span className="font-medium">{label}</span>
        {selectedLabel && <span className="text-muted">: {selectedLabel}</span>}
      </p>
      <div className="mt-2.5">{children({ labelId, errorId })}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-primary-dark">
          {error}
        </p>
      )}
    </div>
  );
}

interface ChipOptionsProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  labelId: string;
  errorId: string;
  hasError: boolean;
}

/** Text chips (sizes, colours) — exact catalog values, no invented swatches. */
export function ChipOptions({ options, value, onChange, labelId, errorId, hasError }: ChipOptionsProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hasError ? errorId : undefined}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-11 min-w-12 rounded-full border px-4 text-sm transition-colors",
              selected
                ? "border-primary-dark bg-blush font-medium text-foreground"
                : "border-line bg-white text-foreground hover:border-primary",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface DesignOptionsProps {
  designs: { id: string; label: string; image: string }[];
  value: string | null;
  onChange: (id: string) => void;
  labelId: string;
  errorId: string;
  hasError: boolean;
}

/** Thumbnail buttons for design variations (e.g. scarf prints). */
export function DesignOptions({ designs, value, onChange, labelId, errorId, hasError }: DesignOptionsProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hasError ? errorId : undefined}
      className="flex flex-wrap gap-2.5"
    >
      {designs.map((design) => {
        const selected = design.id === value;
        return (
          <button
            key={design.id}
            type="button"
            aria-pressed={selected}
            aria-label={design.label}
            onClick={() => onChange(design.id)}
            className="group flex w-16 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "relative block aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors",
                selected ? "border-primary-dark" : "border-line group-hover:border-primary",
              )}
            >
              <Image src={design.image} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <span className={cn("text-[0.6875rem]", selected ? "font-medium text-foreground" : "text-muted")}>
              {design.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
