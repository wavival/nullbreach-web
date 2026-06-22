import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-sm rounded px-md py-sm",
        "border border-error text-error",
        "bg-[rgba(255,139,124,0.1)]",
        "animate-slide-down",
        className,
      )}
    >
      <AlertCircle className="size-4 shrink-0 mt-[2px]" />
      <span className="text-body-sm flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "text-body-sm font-medium underline-offset-2 hover:underline",
            "transition-colors duration-hover",
          )}
        >
          Retry
        </button>
      )}
    </div>
  );
}
