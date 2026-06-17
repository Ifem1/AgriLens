import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "escalated";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  success: "bg-green-500/10 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  danger: "bg-red-500/10 text-red-400 border-red-500/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  escalated: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
