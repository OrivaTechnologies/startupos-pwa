"use client";

import { useState, useTransition } from "react";
import { Download, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportTransactionsCsv } from "@/app/(app)/transactions/actions";

export function TransactionExportDialog({
  activeType,
  activeProjectId,
  activeFrom,
  activeTo,
}: {
  activeType?: "expense" | "income" | "transfer";
  activeProjectId?: string;
  activeFrom?: string;
  activeTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(activeFrom ?? "");
  const [to, setTo] = useState(activeTo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportTransactionsCsv({
        type: activeType,
        projectId: activeProjectId,
        from: from || undefined,
        to: to || undefined,
      });
      if (result.error || !result.csv) {
        setError(result.error ?? "Failed to export");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename ?? "transactions.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          aria-label="Export transactions"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <Download className="size-4" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Export as CSV</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <X className="size-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4">
          <p className="text-xs text-muted-foreground">
            Dates and times are shown in IST. Leave a field blank to export from the
            beginning or through today.
          </p>
          <div className="flex items-center gap-2" data-vaul-no-drag>
            <div className="flex-1">
              <p className="pb-1 text-xs uppercase text-muted-foreground">From</p>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                data-vaul-no-drag
              />
            </div>
            <div className="flex-1">
              <p className="pb-1 text-xs uppercase text-muted-foreground">To</p>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                data-vaul-no-drag
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DrawerFooter className="flex-row">
          <Button className="flex-1" onClick={handleExport} disabled={isPending}>
            {isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
