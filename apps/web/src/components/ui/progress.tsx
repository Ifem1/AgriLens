import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number;
  className?: string;
  color?: string;
}

export function Progress({ value, className, color = "bg-green-500" }: ProgressProps) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#1a2e1a]", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
