import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, readOnly, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        readOnly={readOnly}
        aria-invalid={error || undefined}
        className={cn(
          // base
          "flex h-10 w-full rounded px-md py-[10px] text-body",
          "bg-surface-alt border text-foreground placeholder:text-foreground-muted",
          "transition-colors duration-hover ease-hover",
          "focus-visible:outline-none",
          // file input
          "file:border-0 file:bg-transparent file:text-body file:font-medium",
          // hover
          "hover:border-neutral",
          // focus
          "focus-visible:bg-surface focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          // disabled
          "disabled:bg-border disabled:text-foreground-muted disabled:cursor-not-allowed disabled:hover:border-border",
          // readonly
          readOnly &&
            "bg-transparent border-border hover:border-border focus-visible:bg-transparent focus-visible:border-border focus-visible:ring-0",
          // error
          error
            ? "border-error focus-visible:border-error focus-visible:ring-error hover:border-error"
            : "border-border",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
