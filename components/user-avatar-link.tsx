"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SwitcherDrawer } from "@/components/switcher";
import { WORKSPACE_OPTIONS, switchWorkspace } from "@/lib/workspace-options";
import type { WorkspaceId } from "@/lib/tools";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const LONG_PRESS_MS = 450;

export function UserAvatarLink({
  name,
  avatarUrl,
  currentModule = "ledger",
  canSwitch = true,
}: {
  name: string;
  avatarUrl?: string | null;
  currentModule?: WorkspaceId;
  canSwitch?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = React.useRef(false);

  // Remember which module is currently in view so the profile page can show
  // it as the active workspace.
  React.useEffect(() => {
    document.cookie = `active_workspace=${currentModule}; path=/; max-age=31536000; samesite=lax`;
  }, [currentModule]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Press-and-hold on the avatar opens the workspace switcher instead of
  // navigating to the profile page — deliberately gated behind a timer so a
  // normal tap (going to /profile) can't accidentally trigger it.
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
    <>
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

      {canSwitch ? (
        <SwitcherDrawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title="Switch workspace"
          options={WORKSPACE_OPTIONS}
          currentId={currentModule}
          onSelect={(id) => switchWorkspace(id as WorkspaceId, router)}
          confirm={{
            title: (option) => `Switch to ${option.label}?`,
            description: () => "You'll leave what you're doing here and switch context.",
          }}
        />
      ) : null}
    </>
  );
}
