"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Copy, Key, MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";
import { UserCell } from "@/components/shared/user-cell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  renameApiKey,
} from "@/lib/api/organization";
import type { ApiKey, ApiKeyScope, CreateApiKeyPayload } from "@/lib/api/organization";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SCOPES: Array<{ value: ApiKeyScope; label: string }> = [
  { value: "tasks:read",    label: "tasks:read" },
  { value: "tasks:write",   label: "tasks:write" },
  { value: "users:read",    label: "users:read" },
  { value: "shifts:read",   label: "shifts:read" },
  { value: "reports:read",  label: "reports:read" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string()).min(1, "Выберите хотя бы один scope"),
  expires_at: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserById(id: number) {
  return MOCK_USERS.find((u) => u.id === id);
}

// ─── Create dialog ────────────────────────────────────────────────────────────

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (key: string, apiKey: ApiKey) => void;
  orgId: string;
}

function CreateKeyDialog({ open, onOpenChange, onCreated, orgId }: CreateKeyDialogProps) {
  const t = useTranslations("screen.organizationSettings");
  const [saving, setSaving] = React.useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", scopes: [], expires_at: "" },
  });

  React.useEffect(() => {
    if (open) form.reset({ name: "", scopes: [], expires_at: "" });
  }, [open, form]);

  async function handleSubmit(values: CreateFormValues) {
    setSaving(true);
    try {
      const payload: CreateApiKeyPayload = {
        name: values.name,
        scopes: values.scopes as ApiKeyScope[],
        expires_at: values.expires_at || undefined,
      };
      const res = await createApiKey(orgId, payload);
      if (res.success && res.key && res.apiKey) {
        onCreated(res.key, res.apiKey);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const FormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("api.name_label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("api.name_placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scopes"
          render={() => (
            <FormItem>
              <FormLabel>{t("api.scopes_label")}</FormLabel>
              <div className="flex flex-col gap-2 mt-1">
                {ALL_SCOPES.map((scope) => (
                  <FormField
                    key={scope.value}
                    control={form.control}
                    name="scopes"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(scope.value)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(
                                checked
                                  ? [...current, scope.value]
                                  : current.filter((v) => v !== scope.value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-mono text-xs cursor-pointer">
                          {scope.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("api.expiry_label")}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({t("api.expiry_optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button type="submit" className="hidden" />
      </form>
    </Form>
  );

  const Footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Отмена
      </Button>
      <Button onClick={form.handleSubmit(handleSubmit)} disabled={saving}>
        {saving ? "Создание..." : "Создать"}
      </Button>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden sm:block max-w-md">
          <DialogHeader>
            <DialogTitle>{t("api.create_dialog_title")}</DialogTitle>
          </DialogHeader>
          {FormContent}
          <DialogFooter>{Footer}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="sm:hidden h-auto pb-0">
          <SheetHeader className="pb-4">
            <SheetTitle>{t("api.create_dialog_title")}</SheetTitle>
          </SheetHeader>
          {FormContent}
          <SheetFooter className="sticky bottom-0 bg-background border-t h-14 flex items-center justify-end gap-2 px-4 mt-4">
            {Footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Key reveal dialog ────────────────────────────────────────────────────────

interface KeyRevealDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rawKey: string;
}

function KeyRevealDialog({ open, onOpenChange, rawKey }: KeyRevealDialogProps) {
  const t = useTranslations("screen.organizationSettings");
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("api.key_success_title")}</DialogTitle>
        </DialogHeader>
        <Alert>
          <AlertDescription className="text-sm">
            {t("api.key_success_warning")}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Input
            readOnly
            value={rawKey}
            className="font-mono text-xs"
          />
          <Button variant="outline" size="icon" onClick={handleCopy} title={t("api.copy")}>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OrgTabApiProps {
  orgId: string;
}

export function OrgTabApi({ orgId }: OrgTabApiProps) {
  const t = useTranslations("screen.organizationSettings");

  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealOpen, setRevealOpen] = React.useState(false);
  const [rawKey, setRawKey] = React.useState("");
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | undefined>();
  const [revokeAlertOpen, setRevokeAlertOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<ApiKey | undefined>();
  const [renameName, setRenameName] = React.useState("");
  const [renameOpen, setRenameOpen] = React.useState(false);

  React.useEffect(() => {
    getApiKeys(orgId).then((res) => {
      setKeys(res.data);
      setLoading(false);
    });
  }, [orgId]);

  function handleCreated(key: string, apiKey: ApiKey) {
    setKeys((prev) => [apiKey, ...prev]);
    setRawKey(key);
    setRevealOpen(true);
    toast.success(t("toasts.key_created"));
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    await revokeApiKey(orgId, revokeTarget.id);
    setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    toast.success(t("toasts.key_revoked"));
    setRevokeTarget(undefined);
  }

  async function handleRename() {
    if (!renameTarget || !renameName.trim()) return;
    await renameApiKey(orgId, renameTarget.id, renameName.trim());
    setKeys((prev) =>
      prev.map((k) => (k.id === renameTarget.id ? { ...k, name: renameName.trim() } : k))
    );
    setRenameOpen(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          {t("api.create_key")}
        </Button>
      </div>

      {/* Table / empty */}
      {keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title={t("api.no_keys")}
          description={t("api.no_keys_desc")}
          action={{ label: t("api.create_key"), onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <ResponsiveDataTable
          data={keys}
          columns={[
            {
              accessorKey: "name",
              header: t("api.col_name"),
              cell: ({ row }) => (
                <span className="font-medium text-sm">{row.original.name}</span>
              ),
            },
            {
              accessorKey: "prefix",
              header: t("api.col_prefix"),
              cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {row.original.prefix}…
                </span>
              ),
            },
            {
              accessorKey: "created_at",
              header: t("api.col_created_at"),
              cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                  {formatDate(row.original.created_at)}
                </span>
              ),
            },
            {
              accessorKey: "last_used_at",
              header: t("api.col_last_used"),
              cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                  {row.original.last_used_at
                    ? formatDate(row.original.last_used_at)
                    : t("api.never_used")}
                </span>
              ),
            },
            {
              id: "created_by",
              header: t("api.col_created_by"),
              cell: ({ row }) => {
                const user = getUserById(row.original.created_by_user_id);
                return user ? (
                  <UserCell user={user} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              },
            },
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Действия</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameTarget(row.original);
                          setRenameName(row.original.name);
                          setRenameOpen(true);
                        }}
                      >
                        {t("api.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setRevokeTarget(row.original);
                          setRevokeAlertOpen(true);
                        }}
                      >
                        {t("api.revoke")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ]}
          mobileCardRender={(apiKey) => {
            const user = getUserById(apiKey.created_by_user_id);
            return (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{apiKey.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{apiKey.prefix}…</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {apiKey.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] font-mono">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameTarget(apiKey);
                        setRenameName(apiKey.name);
                        setRenameOpen(true);
                      }}
                    >
                      {t("api.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setRevokeTarget(apiKey);
                        setRevokeAlertOpen(true);
                      }}
                    >
                      {t("api.revoke")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }}
        />
      )}

      {/* Dialogs */}
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
        orgId={orgId}
      />

      <KeyRevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        rawKey={rawKey}
      />

      {/* Revoke confirm */}
      <AlertDialog open={revokeAlertOpen} onOpenChange={setRevokeAlertOpen}>
        <ConfirmDialog
          title={t("api.revoke_confirm_title")}
          message={t("api.revoke_confirm_message")}
          confirmLabel={t("api.revoke_confirm_action")}
          variant="destructive"
          onConfirm={handleRevoke}
          onOpenChange={setRevokeAlertOpen}
        />
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("api.rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleRename}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
