import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconButtonVariant = "ghost" | "outline" | "soft";
type IconButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: "text-foreground hover:bg-blush hover:text-primary-dark",
  outline: "border border-line text-foreground hover:border-primary hover:bg-blush",
  soft: "bg-blush text-foreground hover:bg-primary/40",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-11 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-5",
  lg: "size-12 [&_svg]:size-5",
};

interface IconButtonStyleOptions {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  className?: string;
}

function iconButtonClassName({ variant = "ghost", size = "md", className }: IconButtonStyleOptions) {
  return cn(
    className?.split(/\s+/).some(token => token === "absolute" || token === "fixed" || token === "sticky") ? "" : "relative",
    "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-soft",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

interface IconContentProps {
  icon: ReactNode;
  /** Extra visual content such as a count badge; hidden from assistive tech. */
  badge?: ReactNode;
}

function IconContent({ icon, badge }: IconContentProps) {
  return (
    <>
      <span aria-hidden="true" className="contents">
        {icon}
      </span>
      {badge && (
        <span aria-hidden="true" className="contents">
          {badge}
        </span>
      )}
    </>
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    Omit<IconButtonStyleOptions, "className">,
    IconContentProps {
  /** Accessible name — required because the button has no visible text. */
  label: string;
}

export function IconButton({
  label,
  icon,
  badge,
  variant,
  size,
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={iconButtonClassName({ variant, size, className })}
      {...props}
    >
      <IconContent icon={icon} badge={badge} />
    </button>
  );
}

export interface IconLinkProps
  extends Omit<ComponentProps<typeof Link>, "children">,
    Omit<IconButtonStyleOptions, "className">,
    IconContentProps {
  /** Accessible name — required because the link has no visible text. */
  label: string;
}

/** An icon-only navigation link styled like IconButton. */
export function IconLink({ label, icon, badge, variant, size, className, ...props }: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={iconButtonClassName({ variant, size, className })}
      {...props}
    >
      <IconContent icon={icon} badge={badge} />
    </Link>
  );
}
