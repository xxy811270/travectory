import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travectory - 路书规划",
  description: "基于高德地图的路书规划工具",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
