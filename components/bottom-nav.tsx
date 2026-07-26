"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, BarChart3, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around border-t border-glass-border bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:bg-card/50">
      {TABS.slice(0, 2).map((tab) => (
        <NavLink key={tab.href} tab={tab} active={pathname.startsWith(tab.href)} />
      ))}
      <div className="w-24 shrink-0" aria-hidden />
      {TABS.slice(2).map((tab) => (
        <NavLink key={tab.href} tab={tab} active={pathname.startsWith(tab.href)} />
      ))}
    </nav>
  );
}

function NavLink({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {tab.label}
    </Link>
  );
}
