"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  Monitor,
  Smartphone,
  Tablet,
  QrCode,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  setupTotp,
  verifyTotp,
  disableTotp,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
} from "@/lib/api/auth";
import type { CurrentUser, ActiveSession } from "@/lib/api/auth";

import { formatDateTime } from "./_shared";

interface SecurityTabProps {
  user: CurrentUser;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

function DeviceIcon({ type }: { type: "desktop" | "mobile" | "tablet" }) {
  if (type === "mobile") return <Smartphone className="size-5 text-muted-foreground" />;
  if (type === "tablet") return <Tablet className="size-5 text-muted-foreground" />;
  return <Monitor className="size-5 text-muted-foreground" />;
}

export function SecurityTab({ user, onUserUpdate }: SecurityTabProps) {
  const t = useTranslations("screen.profile");

  // Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  useEffect(() => {
    setSessionsLoading(true);
    getActiveSessions().then((res) => {
      setSessions(res.data);
      setSessionsLoading(false);
    });
  }, []);

  async function handleRevokeSession(id: string) {
    setRevokingSessionId(id);
    const res = await terminateSession(id);
    setRevokingSessionId(null);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success(t("toasts.session_revoked"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    const res = await terminateAllOtherSessions();
    setRevokingAll(false);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success(t("toasts.session_revoked"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // TOTP
  const [totpEnabled, setTotpEnabled] = useState(user.totp_enabled ?? false);
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [totpDisableOpen, setTotpDisableOpen] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qr_url: string; backup_codes: string[] } | null>(null);
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpDisableLoading, setTotpDisableLoading] = useState(false);
  const [totpSetupStep, setTotpSetupStep] = useState<"qr" | "verify" | "backup">("qr");

  async function handleOpenTotpSetup() {
    setTotpSetupOpen(true);
    setTotpSetupStep("qr");
    const res = await setupTotp();
    setTotpSetupData(res.data);
  }

  async function handleVerifyTotpSetup() {
    if (totpSetupCode.length !== 6) return;
    setTotpSetupLoading(true);
    const res = await verifyTotp(user.id, totpSetupCode);
    setTotpSetupLoading(false);
    if (res.data) {
      setTotpSetupStep("backup");
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleDisableTotp() {
    if (totpDisableCode.length !== 6) return;
    setTotpDisableLoading(true);
    const res = await disableTotp(totpDisableCode);
    setTotpDisableLoading(false);
    if (res.success) {
      setTotpEnabled(false);
      onUserUpdate({ totp_enabled: false });
      setTotpDisableOpen(false);
      setTotpDisableCode("");
      toast.success(t("toasts.totp_disabled"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  const nonCurrentSessions = sessions.filter((s) => !s.is_current);

  return (
    <div className="space-y-6">
      {/* Password card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.password_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertDescription>
              {t("sections.security.password_sso_hint")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* TOTP card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.totp_card")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {totpEnabled ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    {t("sections.security.totp_enabled")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    {t("sections.security.totp_disabled")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("sections.security.totp_hint")}
              </p>
            </div>
            {totpEnabled ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setTotpDisableOpen(true)}
              >
                {t("sections.security.totp_disable")}
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleOpenTotpSetup}>
                <QrCode className="mr-2 size-4" />
                {t("sections.security.totp_setup")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.sessions_card")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <DeviceIcon type={session.device_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{session.device_name}</span>
                      {session.is_current && (
                        <Badge className="bg-success/10 text-success border-success/20 text-[11px]">
                          {t("sections.security.session_current")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ip} · {session.city} · {formatDateTime(session.last_activity_at, "ru")}
                    </p>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      aria-label={t("sections.security.session_revoke")}
                    >
                      {revokingSessionId === session.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {nonCurrentSessions.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setRevokeAllOpen(true)}
                    disabled={revokingAll}
                  >
                    {revokingAll && <Spinner className="mr-2 size-4" />}
                    {t("sections.security.session_revoke_all")}
                  </Button>
                  <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
                    <ConfirmDialog
                      title={t("sections.security.session_revoke_all_confirm_title")}
                      message={t("sections.security.session_revoke_all_confirm_message")}
                      confirmLabel={t("sections.security.session_revoke")}
                      variant="destructive"
                      onConfirm={handleRevokeAll}
                      onOpenChange={setRevokeAllOpen}
                    />
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* TOTP Setup Dialog */}
      <Dialog open={totpSetupOpen} onOpenChange={setTotpSetupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sections.security.totp_setup_title")}</DialogTitle>
            <DialogDescription>
              {t("sections.security.totp_setup_description")}
            </DialogDescription>
          </DialogHeader>

          {totpSetupStep === "qr" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {totpSetupData ? (
                  <div className="rounded-lg border bg-muted p-4 text-center space-y-2">
                    <QrCode className="size-16 mx-auto text-primary" />
                    <p className="text-xs font-mono bg-card rounded px-2 py-1 border">
                      {totpSetupData.secret}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("sections.security.totp_setup_secret_hint")}
                    </p>
                  </div>
                ) : (
                  <Skeleton className="size-36 rounded-lg" />
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t("sections.security.totp_setup_scan_hint")}
              </p>
              <Button
                className="w-full"
                onClick={() => setTotpSetupStep("verify")}
                disabled={!totpSetupData}
              >
                {t("sections.security.totp_setup_next")}
              </Button>
            </div>
          )}

          {totpSetupStep === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t("sections.security.totp_setup_enter_code")}
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpSetupCode}
                  onChange={setTotpSetupCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyTotpSetup}
                disabled={totpSetupCode.length !== 6 || totpSetupLoading}
              >
                {totpSetupLoading && <Spinner className="mr-2 size-4" />}
                {t("sections.security.totp_setup_confirm")}
              </Button>
            </div>
          )}

          {totpSetupStep === "backup" && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  {t("sections.security.totp_backup_warning")}
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                {totpSetupData?.backup_codes.map((code) => (
                  <code key={code} className="text-xs bg-muted rounded px-2 py-1 font-mono text-center">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setTotpEnabled(true);
                  onUserUpdate({ totp_enabled: true });
                  setTotpSetupOpen(false);
                  setTotpSetupCode("");
                  setTotpSetupStep("qr");
                  toast.success(t("toasts.totp_enabled"));
                }}
              >
                {t("sections.security.totp_backup_done")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TOTP Disable AlertDialog */}
      <AlertDialog open={totpDisableOpen} onOpenChange={setTotpDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sections.security.totp_disable_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sections.security.totp_disable_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={totpDisableCode}
              onChange={setTotpDisableCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setTotpDisableOpen(false); setTotpDisableCode(""); }}>
              {t("save_bar.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableTotp}
              disabled={totpDisableCode.length !== 6 || totpDisableLoading}
            >
              {totpDisableLoading && <Spinner className="mr-2 size-4" />}
              {t("sections.security.totp_disable")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
