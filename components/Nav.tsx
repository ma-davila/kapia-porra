import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/session";
import logo from "@/public/logo.png";

const links = [
  { href: "/", label: "Groups" },
  { href: "/predict", label: "My Predictions" },
  { href: "/bracket", label: "Bracket" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/settings", label: "Settings" },
];

export default async function Nav() {
  const session = await getSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-900">
          <Image src={logo} alt="Kapia World Cup Porra" width={40} height={40} className="h-10 w-10 rounded-md" priority />
          <span className="text-lg leading-tight">
            Kapia&apos;s World Cup <span className="text-kapia">Porra</span>
          </span>
        </Link>
        {session && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </Link>
            ))}
            <span className="ml-2 hidden text-slate-400 sm:inline">|</span>
            <span className="ml-1 px-2 font-semibold text-slate-700">{session.name}</span>
            <form action="/api/logout" method="post">
              <button className="rounded-md px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                Log out
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
