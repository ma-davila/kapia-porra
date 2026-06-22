import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Kapia's World Cup Porra",
  description: "Predict the 2026 FIFA World Cup and climb the Kapia leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
          Kapia&apos;s World Cup Porra · 2026 FIFA World Cup
        </footer>
      </body>
    </html>
  );
}
