import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
