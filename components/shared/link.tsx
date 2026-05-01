"use client";

import { Link as NextIntlLink } from "next-intl";
import type { ComponentProps } from "react";

export type LinkProps = ComponentProps<typeof NextIntlLink>;

/**
 * Locale-aware Link component that wraps next-intl Link.
 * Automatically handles locale prefixes based on the current locale.
 */
export function Link(props: LinkProps) {
  return <NextIntlLink {...props} />;
}
