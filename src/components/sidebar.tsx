"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export type NavItem = { label: string; href: string };

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
