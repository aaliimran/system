import Link from "next/link";
import { signOut } from "@/app/actions";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/skills", label: "Skills" },
  { href: "/quests", label: "Quests" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({
  active,
}: {
  active: "/" | "/skills" | "/quests" | "/settings";
}) {
  return (
    <header className="flex items-center justify-between border-b border-border pb-4">
      <nav className="flex gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              active === link.href
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
