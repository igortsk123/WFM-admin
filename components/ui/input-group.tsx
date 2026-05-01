import * as React from "react";
import { cn } from "@/lib/utils";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function InputGroup({ children, className, ...props }: InputGroupProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 [&>input]:border-0 [&>input]:focus-visible:ring-0 [&>input]:focus-visible:ring-offset-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function InputGroupAddon({
  children,
  className,
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      className={cn(
        "flex items-center px-3 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
