import "./globals.css";
import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/query-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CV Beautify",
  description: "AI-powered resume generator",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <QueryProvider>
          <TooltipProvider>
            <I18nProvider>
              {children}
              <Toaster />
            </I18nProvider>
          </TooltipProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
