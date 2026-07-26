import Link from "next/link";
import { Plus } from "lucide-react";

export function Fab() {
  return (
    <Link
      href="/transactions/new"
      className="fixed bottom-6 left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
      aria-label="Add transaction"
    >
      <Plus className="size-6" />
    </Link>
  );
}
