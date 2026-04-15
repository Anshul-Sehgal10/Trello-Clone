import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TaskFlow — Kanban Board",
  description: "A beautiful, modern Kanban-style project management board",
  keywords: ["kanban", "project management", "tasks", "boards", "trello"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body
        className="flex min-h-full flex-col overflow-hidden text-[#1f2937]"
        style={{
          background:
            "radial-gradient(ellipse 1100px 560px at -15% -20%, rgba(141, 183, 255, 0.38) 0%, transparent 70%), " +
            "radial-gradient(ellipse 1000px 520px at 115% 15%, rgba(124, 58, 237, 0.26) 0%, transparent 68%), " +
            "linear-gradient(135deg, #0d1525 0%, #0f2347 38%, #1a0d40 100%)",
          fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
