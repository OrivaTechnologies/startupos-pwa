"use client";

import * as React from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer as VaulDrawer,
  DrawerClose as VaulDrawerClose,
  DrawerContent as VaulDrawerContent,
  DrawerHeader as VaulDrawerHeader,
  DrawerTitle as VaulDrawerTitle,
  DrawerFooter as VaulDrawerFooter,
  DrawerTrigger as VaulDrawerTrigger,
} from "@/components/ui/drawer";

type RootProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

type TriggerProps = {
  asChild?: boolean;
  children?: React.ReactNode;
};

type SectionProps = {
  className?: string;
  children?: React.ReactNode;
};

// Same picker/filter sheet, two shells: a bottom sheet on mobile (thumb
// reach, matches the installed-app feel) and a centered dialog on
// desktop/tablet (no edge to drag from, and a floating sheet reads as a
// stray box rather than a "proper" web app modal).
function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)");
}

function Drawer({ children, ...props }: RootProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? Dialog : VaulDrawer;
  return <Comp {...props}>{children}</Comp>;
}

function DrawerTrigger({ children, ...props }: TriggerProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? DialogTrigger : VaulDrawerTrigger;
  return <Comp {...props}>{children}</Comp>;
}

function DrawerClose({ children, ...props }: TriggerProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? DialogClose : VaulDrawerClose;
  return <Comp {...props}>{children}</Comp>;
}

function DrawerContent({ className, children }: SectionProps) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <DialogContent
        showCloseButton={false}
        className={cn("flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md", className)}
      >
        {children}
      </DialogContent>
    );
  }
  return <VaulDrawerContent className={className}>{children}</VaulDrawerContent>;
}

function DrawerHeader({ className, children }: SectionProps) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    // DrawerContent's Dialog branch is p-0 (children own their padding, same
    // as the vaul drawer), but DialogHeader itself carries none — add it
    // here instead of leaning on DialogContent's default padding.
    return <DialogHeader className={cn("px-4 pt-4 pb-3", className)}>{children}</DialogHeader>;
  }
  return <VaulDrawerHeader className={className}>{children}</VaulDrawerHeader>;
}

function DrawerTitle({ className, children }: SectionProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? DialogTitle : VaulDrawerTitle;
  return <Comp className={className}>{children}</Comp>;
}

function DrawerFooter({ className, children }: SectionProps) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    // DialogFooter's default className assumes a p-4 DialogContent parent
    // (it bleeds to the edge with -mx-4 -mb-4) — cancel that since our
    // DrawerContent's Dialog branch is p-0.
    return (
      <DialogFooter className={cn("m-0 border-t-0 bg-transparent px-4 pb-4", className)}>
        {children}
      </DialogFooter>
    );
  }
  return <VaulDrawerFooter className={className}>{children}</VaulDrawerFooter>;
}

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter };
