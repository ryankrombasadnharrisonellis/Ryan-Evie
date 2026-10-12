"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏡" },
  { href: "/notes", label: "Notes", icon: "💌" },
  { href: "/question", label: "Question", icon: "❓" },
  { href: "/play", label: "Play", icon: "🎲" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const path = usePathname();
  if (path === "/login" || path.startsWith("/install")) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-card/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 px-2 pb-2 pt-2.5 text-[11px] font-semibold transition ${
                  active ? "text-rose" : "text-muted"
                }`}
              >
                <span className={`text-xl transition ${active ? "scale-110" : "opacity-80 grayscale-[40%]"}`}>{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
