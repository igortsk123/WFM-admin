import { AlertTriangle, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

interface BannersProps {
  isClientDirect: boolean;
  overspentCount: number;
}

export function DashboardBanners({
  isClientDirect,
  overspentCount,
}: BannersProps) {
  return (
    <>
      {/* CLIENT_DIRECT info banner */}
      {isClientDirect && (
        <Alert className="border-info/20 bg-info/5">
          <Info className="size-4 text-info" aria-hidden="true" />
          <AlertDescription className="text-sm text-info">
            Режим: оплата клиентом самостоятельно. Стоимость отображается
            справочно по нормативам.
          </AlertDescription>
        </Alert>
      )}

      {/* Overspend alert */}
      {overspentCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>
            Перерасход на {overspentCount}{" "}
            {overspentCount === 1 ? "объекте" : "объектах"}. Согласование заявок
            по ним заблокировано.
          </AlertTitle>
          <AlertDescription>
            <Link
              href={`${ADMIN_ROUTES.freelanceApplications}?overspend=true`}
              className="underline underline-offset-2"
            >
              Смотреть список объектов с перерасходом →
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
