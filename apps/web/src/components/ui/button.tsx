import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-green-500 text-black hover:bg-green-400 active:bg-green-600": variant === "primary",
            "bg-[#111c11] text-green-400 border border-[#1a2e1a] hover:border-green-500/50 hover:bg-[#162016]": variant === "secondary",
            "text-green-400 hover:bg-[#111c11]": variant === "ghost",
            "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20": variant === "danger",
            "border border-green-500/40 text-green-400 hover:bg-green-500/10": variant === "outline",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
