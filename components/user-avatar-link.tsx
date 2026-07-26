"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Landmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const LONG_PRESS_MS = 450;

// Press-and-hold on the avatar switches between the app's modules.
const OTHER_MODULE = {
  ledger: { label: "Tasks", href: "/tasks", icon: ListChecks },
  tasks: { label: "Ledger", href: "/home", icon: Landmark },
} as const;

export function UserAvatarLink({
  name,
  avatarUrl,
  currentModule = "ledger",
  canSwitch = true,
}: {
  name: string;
  avatarUrl?: string | null;
  currentModule?: keyof typeof OTHER_MODULE;
  canSwitch?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = React.useRef(false);

  const other = OTHER_MODULE[currentModule];
  const OtherIcon = other.icon;
  const otherModule = currentModule === "ledger" ? "tasks" : "ledger";

  // Remember which module is currently in view so the profile page can show
  // it as the active workspace.
  React.useEffect(() => {
    document.cookie = `active_workspace=${currentModule}; path=/; max-age=31536000; samesite=lax`;
  }, [currentModule]);

  React.useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDownOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    if (!canSwitch) return;
    longPressedRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    router.push("/profile");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={canSwitch ? "View profile, or press and hold to switch modules" : "View profile"}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? menuOpen : undefined}
        className="touch-manipulation rounded-full select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={(event) => event.preventDefault()}
        onClick={handleClick}
      >
        <Avatar className="size-10 border border-border">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-32 rounded-lg bg-popover/90 p-1 text-popover-foreground shadow-md ring-1 ring-glass-border backdrop-blur-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              document.cookie = `active_workspace=${otherModule}; path=/; max-age=31536000; samesite=lax`;
              router.push(other.href);
              // See active-workspace.tsx: the (app) layout's sidebar reads
              // this cookie, and cached layout output needs a refresh to
              // pick it up.
              router.refresh();
            }}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <OtherIcon className="size-4" />
            {other.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}
