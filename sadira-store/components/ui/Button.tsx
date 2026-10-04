import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * primary uses ink on white text for AA contrast; the rose tones (#E98FA9 /
 * #C85E7C) are below 4.5:1 with white text, so rose carries dark text instead.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-white hover:bg-foreground/85",
  secondary: "bg-primary text-foreground hover:bg-primary/80",
  outline: "border border-foreground/80 text-foreground hover:bg-blush",
  ghost: "text-foreground hover:bg-blush",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-sm",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Shared button styling, so links and buttons look identical. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide whitespace-nowrap",
    "transition-colors duration-200 ease-soft select-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonContentProps {
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  loading?: boolean;
  children?: ReactNode;
}

function ButtonContent({ icon, iconPosition = "start", loading, children }: ButtonContentProps) {
  const leading = loading ? <LoadingSpinner size="sm" decorative /> : icon;
  return (
    <>
      {iconPosition === "start" && leading}
      {children}
      {iconPosition === "end" && (loading ? null : icon)}
    </>
  );
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonStyleOptions, "className">,
    Omit<ButtonContentProps, "children"> {}

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition,
  loading = false,
  disabled,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      <ButtonContent icon={icon} iconPosition={iconPosition} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  );
}

export interface ButtonLinkProps
  extends ComponentProps<typeof Link>,
    Omit<ButtonStyleOptions, "className">,
    Omit<ButtonContentProps, "children" | "loading"> {}

/** A navigation link styled as a button. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, fullWidth, className })} {...props}>
      <ButtonContent icon={icon} iconPosition={iconPosition}>
        {children}
      </ButtonContent>
    </Link>
  );
}
