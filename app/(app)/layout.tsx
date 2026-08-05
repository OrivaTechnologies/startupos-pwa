import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/access";
import { getCurrentProfile, getVisibleTaskProjects } from "@/lib/queries";
import { AppSidebar } from "@/components/app-sidebar";
import { AppContentShell } from "@/components/app-content-shell";
import type { WorkspaceId } from "@/lib/tools";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const [profile, access] = await Promise.all([
    getCurrentProfile(supabase),
    getAccessContext(supabase),
  ]);

  if (!access) {
    redirect("/");
  }

  // Revocation-safe check: RLS on `profiles` only returns a row for
  // allowlisted users, so a missing profile means access was revoked since
  // the session was issued.
  if (!profile) {
    await supabase.auth.signOut();
    redirect("/unauthorized");
  }

  const cookieStore = await cookies();
  const activeWorkspace: WorkspaceId =
    cookieStore.get("active_workspace")?.value === "tasks" ? "tasks" : "ledger";
  const taskProjects =
    activeWorkspace === "tasks" ? await getVisibleTaskProjects(supabase) : [];

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col md:max-w-none md:flex-row">
      <AppSidebar
        activeWorkspace={activeWorkspace}
        canSwitchWorkspace={access.tools.length > 1}
        taskProjects={taskProjects}
        currentUserRole={profile.role}
        name={profile.full_name || profile.email || "Account"}
        avatarUrl={profile.avatar_url}
      />
      <AppContentShell>{children}</AppContentShell>
      {modal}
    </div>
  );
}
