import * as React from "react";
import { cn } from "@/lib/utils";

interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function Item({ children, className, ...props }: ItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ItemIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ItemIcon({ children, className, ...props }: ItemIconProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ItemContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ItemContent({
  children,
  className,
  ...props
}: ItemContentProps) {
  return (
    <div className={cn("flex-1 min-w-0", className)} {...props}>
      {children}
    </div>
  );
}

interface ItemTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function ItemTitle({ children, className, ...props }: ItemTitleProps) {
  return (
    <p
      className={cn("text-sm font-medium leading-none truncate", className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface ItemDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function ItemDescription({
  children,
  className,
  ...props
}: ItemDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground truncate", className)}
      {...props}
    >
      {children}
    </p>
  );
}
