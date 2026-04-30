import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[4px] border px-2 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 gap-1 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#E8EEFF] text-[#155DFF]",
        secondary: "border-transparent bg-[#E5E7EB] text-[#6B6B60]",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
