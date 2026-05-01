import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { routing, type Locale } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Load messages for the current locale
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} bg-background`}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            <AuthProvider>
              <SidebarProvider defaultOpen>
                {children}
              </SidebarProvider>
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
