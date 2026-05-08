"use client"

import { useTranslations } from "next-intl"
import {
  Plus,
  Shield,
  Pencil,
  MoreHorizontal,
  UserCog,
  MoveRight,
  KeyRound,
  Archive,
  BanIcon,
  UserCheck,
} from "lucide-react"
import Link from "next/link"

import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { EditProfileDialogContent } from "../edit-profile-dialog-content"
import type { EditProfileData } from "../edit-profile-dialog-content"
import { ManagePermissionsDialogContent } from "../manage-permissions-dialog-content"
import {
  EditProfileMobileContent,
  PermissionsMobileContent,
} from "./mobile-sheets"

interface HeroActionsProps {
  user: UserDetail
  userId: number
  isMobile: boolean
  localPermissions: Permission[]
  // Dialog state
  managePermsOpen: boolean
  setManagePermsOpen: (open: boolean) => void
  editProfileOpen: boolean
  setEditProfileOpen: (open: boolean) => void
  archiveOpen: boolean
  setArchiveOpen: (open: boolean) => void
  blockOpen: boolean
  setBlockOpen: (open: boolean) => void
  blockReason: string
  setBlockReason: (v: string) => void
  blockLoading: boolean
  // Handlers
  onSaveProfile: (data: EditProfileData) => Promise<void>
  onSavePermissions: (permissions: Permission[]) => Promise<void>
  onArchive: () => Promise<void>
  onBlock: () => Promise<void>
  onActivate: () => Promise<void>
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

export function HeroActions({
  user,
  userId,
  isMobile,
  localPermissions,
  managePermsOpen,
  setManagePermsOpen,
  editProfileOpen,
  setEditProfileOpen,
  archiveOpen,
  setArchiveOpen,
  blockOpen,
  setBlockOpen,
  blockReason,
  setBlockReason,
  blockLoading,
  onSaveProfile,
  onSavePermissions,
  onArchive,
  onBlock,
  onActivate,
  t,
  tCommon,
}: HeroActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
      <Button
        size="sm"
        asChild
        className="min-h-11 w-full flex-1 md:w-auto md:flex-none"
      >
        <Link href={`${ADMIN_ROUTES.taskNew}?assignee_id=${userId}`}>
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("actions.assign_task")}</span>
          <span className="sm:hidden">{t("actions.assign_task")}</span>
        </Link>
      </Button>

      {/* Manage permissions */}
      {isMobile ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 md:flex-none"
            onClick={() => setManagePermsOpen(true)}
          >
            <Shield className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("actions.permissions")}</span>
          </Button>
          <Sheet open={managePermsOpen} onOpenChange={setManagePermsOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("dialogs.manage_permissions_title")}</SheetTitle>
              </SheetHeader>
              <PermissionsMobileContent
                currentPermissions={localPermissions}
                onSave={onSavePermissions}
                onClose={() => setManagePermsOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Dialog open={managePermsOpen} onOpenChange={setManagePermsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11">
              <Shield className="size-4" aria-hidden="true" />
              {t("actions.permissions")}
            </Button>
          </DialogTrigger>
          <ManagePermissionsDialogContent
            currentPermissions={localPermissions}
            onSave={onSavePermissions}
            onOpenChange={setManagePermsOpen}
          />
        </Dialog>
      )}

      {/* Edit profile */}
      {isMobile ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 md:flex-none"
            onClick={() => setEditProfileOpen(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("actions.edit")}</span>
          </Button>
          <Sheet open={editProfileOpen} onOpenChange={setEditProfileOpen}>
            <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>{t("dialogs.edit_profile_title")}</SheetTitle>
              </SheetHeader>
              <EditProfileMobileContent
                user={user}
                onSave={onSaveProfile}
                onClose={() => setEditProfileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11">
              <Pencil className="size-4" aria-hidden="true" />
              {t("actions.edit")}
            </Button>
          </DialogTrigger>
          <EditProfileDialogContent
            user={user}
            onSave={onSaveProfile}
            onOpenChange={setEditProfileOpen}
          />
        </Dialog>
      )}

      {/* ⋮ More dropdown */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11 px-2">
              <MoreHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only">{t("actions.more")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {user.type === "STAFF" && (
              <>
                <DropdownMenuItem>
                  <UserCog className="size-4 mr-2" aria-hidden="true" />
                  {t("actions.change_position")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MoveRight className="size-4 mr-2" aria-hidden="true" />
                  {t("actions.transfer_store")}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <KeyRound className="size-4 mr-2" aria-hidden="true" />
              {t("actions.reset_password")}
            </DropdownMenuItem>
            {/* FREELANCE-specific: block / activate */}
            {user.type === "FREELANCE" && (
              <>
                <DropdownMenuSeparator />
                {user.freelancer_status !== "BLOCKED" ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setBlockOpen(true)}
                  >
                    <BanIcon className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.block")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onActivate}>
                    <UserCheck className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.activate")}
                  </DropdownMenuItem>
                )}
                {(user.freelancer_status === "NEW" || user.freelancer_status === "VERIFICATION") && (
                  <DropdownMenuItem onClick={onActivate}>
                    <UserCheck className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.activate")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Archive className="size-4 mr-2" aria-hidden="true" />
                {t("actions.archive")}
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.archive_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.archive_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onArchive}
            >
              {tCommon("archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block dialog (FREELANCE only) */}
      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.block_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.block_dialog_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2">
            <Label htmlFor="block-reason" className="text-sm font-medium">
              {t("actions.block_reason_label")}
            </Label>
            <Textarea
              id="block-reason"
              className="mt-1.5 resize-none"
              rows={3}
              placeholder={t("actions.block_reason_placeholder")}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBlockReason("")}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onBlock}
              disabled={blockLoading}
            >
              {t("actions.block_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
