import type * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

/**
 * Primary action control. Phosphor primary glows; secondary/ghost/destructive
 * are outline or text. All numeric labels inside should use mono.
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visual weight. @default 'secondary' */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: ButtonSize;
  /** Leading icon name. */
  iconLeft?: IconName;
  /** Trailing icon name. */
  iconRight?: IconName;
  /** Swap content for an inline spinner and disable. @default false */
  loading?: boolean;
  children?: React.ReactNode;
}

interface SizeStyle {
  height: string;
  padding: string;
  font: string;
  gap: number;
  icon: number;
}

const SIZES: Record<ButtonSize, SizeStyle> = {
  sm: { height: "var(--control-h-sm)", padding: "0 12px", font: "var(--text-xs)", gap: 6, icon: 16 },
  md: { height: "var(--control-h)", padding: "0 14px", font: "500 14px/1 var(--font-ui)", gap: 8, icon: 16 },
  lg: { height: "var(--control-h-lg)", padding: "0 20px", font: "500 15px/1 var(--font-ui)", gap: 8, icon: 20 },
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--phosphor)] text-[var(--bg-void)] border-transparent",
    "[box-shadow:var(--glow-phosphor)] disabled:[box-shadow:none]",
    "enabled:hover:bg-[color-mix(in_srgb,var(--phosphor)_85%,white)]",
    "enabled:hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--phosphor)_38%,transparent)]",
    "enabled:active:bg-[color-mix(in_srgb,var(--phosphor)_90%,black)]",
  ),
  secondary: cn(
    "bg-transparent text-[var(--text-hi)] border-[var(--border-strong)]",
    "enabled:hover:bg-[var(--phosphor-08)] enabled:active:bg-[var(--phosphor-12)]",
  ),
  ghost: cn(
    "bg-transparent text-[var(--text-body)] border-transparent",
    "enabled:hover:bg-[color-mix(in_srgb,var(--text-mid)_8%,transparent)]",
    "enabled:active:bg-[color-mix(in_srgb,var(--text-mid)_14%,transparent)]",
  ),
  destructive: cn(
    "bg-transparent text-[var(--red)] border-[color-mix(in_srgb,var(--red)_42%,transparent)]",
    "enabled:hover:bg-[var(--red-14)]",
    "enabled:active:bg-[color-mix(in_srgb,var(--red)_22%,transparent)]",
  ),
};

/**
 * Button — primary action control. Phosphor primary glows; others are outline/ghost.
 */
export function Button({
  variant = "secondary",
  size = "md",
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  children,
  className,
  style,
  type = "button",
  ...rest
}: ButtonProps) {
  const sz = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap select-none",
        "border rounded-[var(--radius-control)]",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
        "[transition:background_var(--dur-fast)_var(--ease-out),box-shadow_var(--dur)_var(--ease-out),opacity_var(--dur-fast)]",
        VARIANTS[variant],
        className,
      )}
      style={{
        height: sz.height,
        padding: sz.padding,
        font: sz.font,
        fontWeight: variant === "primary" ? 600 : 500,
        gap: sz.gap,
        letterSpacing: "0.005em",
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={sz.icon} />}
      {!loading && iconLeft && <Icon name={iconLeft} size={sz.icon} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={sz.icon} />}
    </button>
  );
}
