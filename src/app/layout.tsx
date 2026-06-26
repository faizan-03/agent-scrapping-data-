import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Automated job discovery, AI matching, CSV export, and email delivery.",
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
