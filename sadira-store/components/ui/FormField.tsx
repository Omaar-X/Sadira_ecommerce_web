import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Labelled form controls with inline errors wired up for assistive tech
 * (aria-invalid + aria-describedby). 16px text so iOS doesn't zoom on focus;
 * scroll-margin so a focused field isn't hidden under the sticky header.
 */

const controlClass = cn(
  "w-full scroll-mt-32 rounded-xl border border-line bg-white px-4 text-base text-foreground transition-colors",
  "placeholder:text-muted hover:border-primary/60",
  "focus:border-primary-dark focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-dark",
  "aria-invalid:border-primary-dark aria-invalid:bg-blush/30",
);

interface FieldShellProps {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, optional, error, hint, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-primary-dark">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type ShellProps = Omit<FieldShellProps, "children">;

export function TextField({
  id,
  label,
  optional,
  error,
  hint,
  className,
  ...props
}: ShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={!optional || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass, "h-12")}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  optional,
  error,
  hint,
  className,
  ...props
}: ShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={!optional || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass, "min-h-24 resize-y py-3 leading-relaxed")}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  optional,
  error,
  hint,
  className,
  children,
  ...props
}: ShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">) {
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={!optional || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(controlClass, "h-12 cursor-pointer appearance-none pr-10")}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
        />
      </div>
    </FieldShell>
  );
}
