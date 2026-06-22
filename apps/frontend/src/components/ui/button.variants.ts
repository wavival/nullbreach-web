import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-sm whitespace-nowrap",
    "rounded font-sans text-body font-medium",
    "transition-colors duration-hover ease-hover",
    "focus-visible:outline-none",
    "disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary-hover active:bg-primary-active",
          "disabled:bg-disabled disabled:opacity-50 disabled:text-primary-foreground",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-primary",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary-hover active:bg-secondary-active",
          "disabled:bg-disabled disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-secondary",
        ].join(" "),
        tertiary: [
          "bg-tertiary text-tertiary-foreground",
          "hover:bg-tertiary-hover active:bg-tertiary-active",
          "disabled:bg-disabled disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-tertiary",
        ].join(" "),
        outlined: [
          "bg-transparent border border-border text-foreground",
          "hover:bg-surface-alt hover:border-neutral",
          "active:bg-surface active:border-foreground",
          "disabled:border-disabled disabled:text-disabled disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-secondary",
        ].join(" "),
        ghost: [
          "bg-transparent text-foreground",
          "hover:bg-surface-alt/50",
          "active:bg-surface",
          "disabled:text-disabled disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-secondary",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-md py-xs text-body-sm",
        md: "h-10 px-lg py-[10px]",
        lg: "h-12 px-xl py-md text-body-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
