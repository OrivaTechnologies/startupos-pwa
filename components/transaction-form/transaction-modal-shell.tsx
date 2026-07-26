"use client";

import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/lib/use-media-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Full-screen sheet on mobile (matches the installed-app feel); a centered,
// height-capped dialog on desktop/tablet where a full-bleed panel would look
// like a stray page rather than a modal.
export function TransactionModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) router.back();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  );
}
