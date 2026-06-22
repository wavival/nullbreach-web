import * as React from "react";
import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeVariantProps } from "./badge.variants";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge };
