import { BottomNav } from "@/components/bottom-nav";
import { Fab } from "@/components/fab";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">{children}</div>
      <Fab />
      <BottomNav />
    </div>
  );
}
