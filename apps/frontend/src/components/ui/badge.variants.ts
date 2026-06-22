import { cva, type VariantProps } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded font-sans text-label font-medium tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        tertiary: "bg-tertiary text-tertiary-foreground",
        neutral: "bg-neutral text-foreground",
        outline: "bg-transparent text-foreground border border-border",
        success: "bg-success text-primary-foreground",
        warning: "bg-warning text-surface",
        error: "bg-error text-tertiary-foreground",
        info: "bg-info text-secondary-foreground",
      },
      size: {
        sm: "px-xs py-[2px] text-[10px]",
        md: "px-sm py-xs",
        lg: "px-md py-[6px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
