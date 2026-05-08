"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Activity, ChevronRight } from "lucide-react"

import type { StoreDetail as StoreDetailData } from "@/lib/api"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DEMO_TEAM_MEMBERS, getInitials } from "./_shared"

interface StoreTeamTabProps {
  data: StoreDetailData
  storeId: number
}

export function StoreTeamTab({ data, storeId }: StoreTeamTabProps) {
  const t = useTranslations("screen.storeDetail")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-base">Сотрудники ({data.team_count})</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder={t("team.search_placeholder")}
              className="h-8 w-48 text-sm pl-8"
            />
            <Activity className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder={t("team.filter_position")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("team.all_positions")}</SelectItem>
              <SelectItem value="STORE_DIRECTOR">Директор магазина</SelectItem>
              <SelectItem value="WORKER">Работник</SelectItem>
              <SelectItem value="OPERATOR">Оператор</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Сотрудник</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Должность</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Телефон</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Статус</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TEAM_MEMBERS.map((emp) => (
                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                          {getInitials(emp.first_name, emp.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={ADMIN_ROUTES.employeeDetail(String(emp.id))}
                        className="font-medium text-foreground hover:text-primary transition-colors truncate"
                      >
                        {emp.last_name} {emp.first_name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.position}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={emp.active ? "default" : "secondary"}
                      className={`text-xs ${emp.active ? "bg-success/15 text-success border-0" : ""}`}
                    >
                      {emp.active ? "На смене" : "Не на смене"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Показано 5 из {data.team_count}</span>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
            <Link href={`${ADMIN_ROUTES.employees}?store_id=${storeId}`}>
              {t("team.view_all")}
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
