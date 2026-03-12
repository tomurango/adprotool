import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "アドプロ",
  description: "店舗向けInstagram投稿アシスタント",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
