"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  BarChart3,
  Landmark,
  ListChecks,
  UserRound,
  Archive,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandMark } from "@/components/brand-mark";
import { SwitcherRow } from "@/components/switcher";
import { WORKSPACE_OPTIONS, switchWorkspace } from "@/lib/workspace-options";
import type { WorkspaceId } from "@/lib/tools";

const LEDGER_TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
] as const;

const TASK_TABS = [
  { href: "/tasks", tab: "all", label: "All Tasks", icon: ListChecks },
  { href: "/tasks?tab=mine", tab: "mine", label: "My Tasks", icon: UserRound },
  { href: "/tasks?tab=archived", tab: "archived", label: "Archived", icon: Archive },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function AppSidebar({
  activeWorkspace,
  canSwitchWorkspace,
  name,
  avatarUrl,
}: {
  activeWorkspace: WorkspaceId;
  canSwitchWorkspace: boolean;
  name: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tasksTab = searchParams.get("tab") ?? "all";
  const currentWorkspaceOption = WORKSPACE_OPTIONS.find((w) => w.id === activeWorkspace)!;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-glass-border bg-glass px-4 py-6 md:sticky md:top-0 md:flex md:h-svh dark:bg-card/30">
      <div className="flex shrink-0 items-center gap-2 px-2 pb-6">
        <BrandMark size={28} />
        <span className="text-lg font-semibold">StartupOS</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {activeWorkspace === "ledger" ? (
          <>
            {LEDGER_TABS.map((tab) => (
              <SidebarLink key={tab.href} href={tab.href} icon={tab.icon} active={pathname.startsWith(tab.href)}>
                {tab.label}
              </SidebarLink>
            ))}

            <Link
              href="/transactions/new"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
            >
              <Plus className="size-4" />
              Add transaction
            </Link>
          </>
        ) : (
          <>
            {TASK_TABS.map((tab) => (
              <SidebarLink
                key={tab.tab}
                href={tab.href}
                icon={tab.icon}
                active={pathname === "/tasks" && tasksTab === tab.tab}
              >
                {tab.label}
              </SidebarLink>
            ))}
          </>
        )}
      </nav>

      <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-glass-border pt-4">
        {canSwitchWorkspace ? (
          <div className="pb-3">
            <SwitcherRow
              label="Active workspace"
              variant="compact"
              current={{
                id: currentWorkspaceOption.id,
                label: currentWorkspaceOption.label,
                icon: currentWorkspaceOption.icon,
              }}
              options={WORKSPACE_OPTIONS}
              onSelect={(id) => switchWorkspace(id as WorkspaceId, router)}
              confirm={{
                title: (option) => `Switch to ${option.label}?`,
                description: () => "You'll leave what you're doing here and switch context.",
              }}
            />
          </div>
        ) : null}

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/profile") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Avatar className="size-8 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{name}</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  className,
  children,
}: {
  href: string;
  icon: typeof Home;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("block w-full", className)}>
      <SidebarLinkFace active={active} icon={Icon}>
        {children}
      </SidebarLinkFace>
    </Link>
  );
}

function SidebarLinkFace({
  active,
  icon: Icon,
  children,
}: {
  active: boolean;
  icon: typeof Home;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  const selected = active || pending;
  return (
    <span
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {children}
    </span>
  );
}
