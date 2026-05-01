import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">WFM Admin</h1>
          <p className="text-sm text-muted-foreground">
            Foundation setup complete — design tokens synced with mobile design system
          </p>
        </header>

        {/* Brand Colors */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Brand Palette</CardTitle>
            <CardDescription className="text-sm">Primary violet #6738DD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="size-12 rounded-lg bg-brand-100" title="brand-100" />
              <div className="size-12 rounded-lg bg-brand-200" title="brand-200" />
              <div className="size-12 rounded-lg bg-brand-300" title="brand-300" />
              <div className="size-12 rounded-lg bg-brand-400" title="brand-400" />
              <div className="size-12 rounded-lg bg-brand-500" title="brand-500" />
              <div className="size-12 rounded-lg bg-brand-600" title="brand-600" />
              <div className="size-12 rounded-lg bg-brand-700" title="brand-700" />
              <div className="size-12 rounded-lg bg-brand-800" title="brand-800" />
              <div className="size-12 rounded-lg bg-brand-900" title="brand-900" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </CardContent>
        </Card>

        {/* Semantic Colors */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Semantic Colors</CardTitle>
            <CardDescription className="text-sm">Status indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-success-foreground">
                <span className="text-sm font-medium">Success</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-warning px-3 py-2 text-warning-foreground">
                <span className="text-sm font-medium">Warning</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-destructive-foreground">
                <span className="text-sm font-medium">Destructive</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-info px-3 py-2 text-info-foreground">
                <span className="text-sm font-medium">Info</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                <span className="text-sm font-medium">Muted</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Color Schemes */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Badge Schemes</CardTitle>
            <CardDescription className="text-sm">6 deterministic colors for work types (workType.id % 6)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-badge-violet-bg-bright text-badge-violet-text-bright">Violet Bright</Badge>
              <Badge className="bg-badge-blue-bg-bright text-badge-blue-text-bright">Blue Bright</Badge>
              <Badge className="bg-badge-yellow-bg-bright text-badge-yellow-text-bright">Yellow Bright</Badge>
              <Badge className="bg-badge-pink-bg-bright text-badge-pink-text-bright">Pink Bright</Badge>
              <Badge className="bg-badge-orange-bg-bright text-badge-orange-text-bright">Orange Bright</Badge>
              <Badge className="bg-badge-green-bg-bright text-badge-green-text-bright">Green Bright</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-badge-violet-bg-light text-badge-violet-text-light">Violet Light</Badge>
              <Badge variant="secondary" className="bg-badge-blue-bg-light text-badge-blue-text-light">Blue Light</Badge>
              <Badge variant="secondary" className="bg-badge-yellow-bg-light text-badge-yellow-text-light">Yellow Light</Badge>
              <Badge variant="secondary" className="bg-badge-pink-bg-light text-badge-pink-text-light">Pink Light</Badge>
              <Badge variant="secondary" className="bg-badge-orange-bg-light text-badge-orange-text-light">Orange Light</Badge>
              <Badge variant="secondary" className="bg-badge-green-bg-light text-badge-green-text-light">Green Light</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Neutral Scale */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Neutral Scale</CardTitle>
            <CardDescription className="text-sm">Slight violet tint for brand cohesion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <div className="size-12 rounded-lg border bg-neutral-0" title="neutral-0" />
              <div className="size-12 rounded-lg bg-neutral-100" title="neutral-100" />
              <div className="size-12 rounded-lg bg-neutral-200" title="neutral-200" />
              <div className="size-12 rounded-lg bg-neutral-300" title="neutral-300" />
              <div className="size-12 rounded-lg bg-neutral-400" title="neutral-400" />
              <div className="size-12 rounded-lg bg-neutral-500" title="neutral-500" />
              <div className="size-12 rounded-lg bg-neutral-600" title="neutral-600" />
              <div className="size-12 rounded-lg bg-neutral-700" title="neutral-700" />
              <div className="size-12 rounded-lg bg-neutral-800" title="neutral-800" />
              <div className="size-12 rounded-lg bg-neutral-900" title="neutral-900" />
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Typography</CardTitle>
            <CardDescription className="text-sm">Inter font family (400/500/600/700)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-2xl font-bold">Headline 24 Bold</p>
              <p className="text-xl font-bold">Headline 20 Bold</p>
              <p className="text-lg font-bold">Headline 18 Bold</p>
              <p className="text-base font-bold tracking-tight">Headline 16 Bold</p>
              <p className="text-sm font-bold tracking-tight">Headline 14 Bold</p>
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium">Headline 16 Medium — Form Labels</p>
              <p className="text-sm font-medium">Headline 14 Medium — Table Headers</p>
              <p className="text-xs font-medium">Headline 12 Medium — Small Chips</p>
            </div>
            <div className="space-y-2">
              <p className="text-base">Body 16 Regular — Primary body text</p>
              <p className="text-sm">Body 14 Regular — Default body size in admin</p>
              <p className="text-xs">Body 12 Regular — Secondary captions</p>
              <p className="text-xs text-muted-foreground">Caption 12 — Muted foreground</p>
            </div>
          </CardContent>
        </Card>

        {/* Color Scales */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Red (Destructive)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="size-8 rounded bg-red-100" />
                <div className="size-8 rounded bg-red-200" />
                <div className="size-8 rounded bg-red-300" />
                <div className="size-8 rounded bg-red-400" />
                <div className="size-8 rounded bg-red-500" />
                <div className="size-8 rounded bg-red-600" />
                <div className="size-8 rounded bg-red-700" />
                <div className="size-8 rounded bg-red-800" />
                <div className="size-8 rounded bg-red-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Green (Success)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="size-8 rounded bg-green-100" />
                <div className="size-8 rounded bg-green-200" />
                <div className="size-8 rounded bg-green-300" />
                <div className="size-8 rounded bg-green-400" />
                <div className="size-8 rounded bg-green-500" />
                <div className="size-8 rounded bg-green-600" />
                <div className="size-8 rounded bg-green-700" />
                <div className="size-8 rounded bg-green-800" />
                <div className="size-8 rounded bg-green-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Blue (Info)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="size-8 rounded bg-blue-100" />
                <div className="size-8 rounded bg-blue-200" />
                <div className="size-8 rounded bg-blue-300" />
                <div className="size-8 rounded bg-blue-400" />
                <div className="size-8 rounded bg-blue-500" />
                <div className="size-8 rounded bg-blue-600" />
                <div className="size-8 rounded bg-blue-700" />
                <div className="size-8 rounded bg-blue-800" />
                <div className="size-8 rounded bg-blue-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Yellow (Warning)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="size-8 rounded bg-yellow-100" />
                <div className="size-8 rounded bg-yellow-200" />
                <div className="size-8 rounded bg-yellow-300" />
                <div className="size-8 rounded bg-yellow-400" />
                <div className="size-8 rounded bg-yellow-500" />
                <div className="size-8 rounded bg-yellow-600" />
                <div className="size-8 rounded bg-yellow-700" />
                <div className="size-8 rounded bg-yellow-800" />
                <div className="size-8 rounded bg-yellow-900" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>WFM Admin Foundation — Synced with WfmColors.kt / WFMColors.swift</p>
        </footer>
      </div>
    </main>
  );
}
