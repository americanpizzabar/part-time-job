import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "お小遣い管理",
  description: "子供のお小遣い・お手伝い管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
