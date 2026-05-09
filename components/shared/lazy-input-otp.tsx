"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Lazy wrappers around the shadcn `InputOTP` primitive (which pulls in the
 * `input-otp` package, ~11.7 kB gz combined with its sibling chunk).
 *
 * OTP slots only appear after the user reaches the verification step of an
 * auth/MFA flow, so deferring the import to first render saves bytes on the
 * initial login / settings/profile bundles.
 */
export const LazyInputOTP = dynamic(
  () => import("@/components/ui/input-otp").then((m) => m.InputOTP),
  {
    ssr: false,
    loading: () => <Skeleton className="h-10 w-full" />,
  }
)

export const LazyInputOTPGroup = dynamic(
  () => import("@/components/ui/input-otp").then((m) => m.InputOTPGroup),
  { ssr: false }
)

export const LazyInputOTPSlot = dynamic(
  () => import("@/components/ui/input-otp").then((m) => m.InputOTPSlot),
  { ssr: false }
)

export const LazyInputOTPSeparator = dynamic(
  () => import("@/components/ui/input-otp").then((m) => m.InputOTPSeparator),
  { ssr: false }
)
