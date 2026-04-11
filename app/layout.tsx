import "./globals.css";
import type { Metadata } from "next";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "../../lib/queryClient";
import { I18nProvider } from "@/components/i18n-provider";

export const metadata: Metadata = {
  title: "CV Beautify",
  description: "AI-powered resume generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <I18nProvider>
              {children}
              <Toaster />
            </I18nProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
