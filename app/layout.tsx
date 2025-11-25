import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CostConfirm - Home Builder Billing Analysis",
  description: "Track and analyze home builder billing against industry standards",
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
