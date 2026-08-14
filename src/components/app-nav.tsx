import Link from "next/link";
import { signOut } from "@/app/actions";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/skills", label: "Skills" },
  { href: "/quests", label: "Quests" },
  { href: "/stats", label: "Stats" },
  { href: "/achievements", label: "Achievements" },
  { href: "/codex", label: "Codex" },
  { href: "/settings", label: "Settings" },
];

export type AppNavActive =
  | "/"
  | "/skills"
  | "/quests"
  | "/stats"
  | "/achievements"
  | "/codex"
  | "/settings";

export function AppNav({ active }: { active: AppNavActive }) {
  return (
    <header className="flex items-center gap-3 border-b border-border pb-4">
      <nav className="flex flex-1 gap-4 overflow-x-auto whitespace-nowrap">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              active === link.href
                ? "text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={signOut} className="shrink-0">
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
