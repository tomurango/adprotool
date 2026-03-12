import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "こうこくーる",
  description: "個人開発者・クリエイターの発信伴走AIツール",
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
