"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "@/lib/api/_auth-token";
import { API_BASE_URL, USE_REAL_API } from "@/lib/api/_config";
import { getCurrentUserMe } from "@/lib/api/users";

export default function DevApiTokenPage() {
  const [token, setToken] = React.useState("");
  const [current, setCurrent] = React.useState<string | null>(null);
  const [meResult, setMeResult] = React.useState<string>("");

  React.useEffect(() => {
    setCurrent(getAuthToken());
  }, []);

  function handleSave() {
    if (!token.trim()) return;
    setAuthToken(token.trim());
    setCurrent(token.trim());
    setToken("");
  }

  function handleClear() {
    clearAuthToken();
    setCurrent(null);
  }

  async function handleTest() {
    setMeResult("Загрузка...");
    try {
      const me = await getCurrentUserMe();
      setMeResult(JSON.stringify(me, null, 2));
    } catch (e) {
      setMeResult(`Ошибка: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dev: API token & backend connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">API_BASE_URL:</span>{" "}
              <code className="text-xs">{API_BASE_URL || "(не задан)"}</code>
            </div>
            <div>
              <span className="text-muted-foreground">USE_REAL_API:</span>{" "}
              <code className="text-xs">{String(USE_REAL_API)}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Текущий токен:</span>{" "}
              <code className="text-xs">
                {current ? `${current.slice(0, 24)}…` : "(не задан)"}
              </code>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <div className="font-medium text-foreground">Документация для backend-разработчика:</div>
            <div>
              📋 <code>lib/api/README.md</code> — полный inventory endpoints (backend-mirrored / admin-only)
            </div>
            <div>
              📋 <code>MIGRATION-NOTES.md</code> (root) — что admin использует поверх backend, по сущностям
            </div>
            <div>
              📋 <code>lib/api/_backend-types.ts</code> — TS-зеркала Pydantic schemas
            </div>
            <div>
              📋 <code>lib/api/&lt;service&gt;.ts</code> — raw fetch wrappers c суффиксом{" "}
              <code>*OnBackend</code> / <code>*FromBackend</code>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">JWT (Bearer token)</label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!token.trim()}>
                Сохранить
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Очистить
              </Button>
              <Button variant="secondary" onClick={handleTest}>
                Тест GET /users/me
              </Button>
            </div>
          </div>

          {meResult && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">
              {meResult}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
