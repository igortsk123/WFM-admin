import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ButtonGroup({ children, className, ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex -space-x-px rounded-lg shadow-sm [&>*:first-child]:rounded-l-lg [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:last-child]:rounded-r-lg [&>*:not(:first-child):not(:last-child)]:rounded-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
