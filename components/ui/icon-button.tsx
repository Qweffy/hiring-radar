import type * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";

type IconButtonVariant = "ghost" | "solid" | "danger";
type IconButtonSize = "sm" | "md" | "lg";

/** Square, icon-only button. `label` is required for accessibility. */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Accessible name (also used as tooltip title). */
  label: string;
  /** @default 'ghost' */
  variant?: IconButtonVariant;
  /** @default 'md' */
  size?: IconButtonSize;
  /** Toggled/selected appearance. @default false */
  active?: boolean;
  loading?: boolean;
}

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 30, icon: 16 },
  md: { box: 36, icon: 18 },
  lg: { box: 44, icon: 20 },
};

/**
 * IconButton — square, icon-only control. Always pass `label` for a11y.
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  active = false,
  loading = false,
  disabled = false,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const sz = SIZES[size];
  const isDisabled = disabled || loading;

  const variantClasses: Record<IconButtonVariant, string> = {
    ghost: cn(
      active
        ? "text-[var(--phosphor)] bg-[var(--phosphor-12)] border-[var(--border-strong)]"
        : "text-[var(--text-body)] bg-transparent border-transparent",
      "enabled:hover:bg-[color-mix(in_srgb,var(--text-mid)_8%,transparent)]",
    ),
    solid: cn(
      "text-[var(--bg-void)] bg-[var(--phosphor)] border-transparent",
      "[box-shadow:var(--glow-phosphor)] disabled:[box-shadow:none]",
      "enabled:hover:bg-[color-mix(in_srgb,var(--phosphor)_85%,white)]",
    ),
    danger: cn(
      "text-[var(--red)] bg-transparent border-transparent",
      "enabled:hover:bg-[var(--red-14)]",
    ),
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center p-0",
        "border rounded-[var(--radius-control)]",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-transparent",
        "[transition:background_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)]",
        variantClasses[variant],
        className,
      )}
      style={{ width: sz.box, height: sz.box, ...style }}
      {...rest}
    >
      {loading ? <Spinner size={sz.icon} /> : <Icon name={icon} size={sz.icon} />}
    </button>
  );
}
