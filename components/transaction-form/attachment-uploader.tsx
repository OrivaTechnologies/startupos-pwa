"use client";

import { useEffect, useMemo, useRef } from "react";
import { Paperclip, ChevronRight, Camera, X, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ReceiptWithUrl } from "@/lib/queries";

function isImage(contentType?: string | null) {
  return !!contentType?.startsWith("image/");
}

function AttachmentTile({
  name,
  previewUrl,
  href,
  onRemove,
}: {
  name: string | null;
  previewUrl?: string | null;
  href?: string | null;
  onRemove?: () => void;
}) {
  const content = previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs, not a static asset next/image can optimize
    <img src={previewUrl} alt={name ?? "Attachment"} className="size-full object-cover" />
  ) : (
    <div className="flex size-full flex-col items-center justify-center gap-1 p-1.5 text-center">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <span className="line-clamp-2 text-[10px] break-all text-muted-foreground">
        {name ?? "File"}
      </span>
    </div>
  );

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block size-full">
          {content}
        </a>
      ) : (
        content
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export function AttachmentUploader({
  value,
  onChange,
  existingReceipts = [],
  onRemoveExisting,
  fileAccept = "image/*,application/pdf",
}: {
  value: File[];
  onChange: (files: File[]) => void;
  existingReceipts?: ReceiptWithUrl[];
  onRemoveExisting?: (receiptId: string) => void;
  fileAccept?: string;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const total = existingReceipts.length + value.length;

  // Local preview thumbnails for not-yet-uploaded files — recomputed
  // whenever the file list changes, and always revoked so we don't leak
  // blob URLs.
  const previewUrls = useMemo(
    () => value.map((file) => URL.createObjectURL(file)),
    [value]
  );
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    onChange([...value, ...picked]);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex w-full items-center gap-3 py-2 text-left">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm">
              {total > 0 ? `${total} attachment${total > 1 ? "s" : ""}` : "Add attachment"}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
            <Camera className="size-4" />
            Take photo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <Paperclip className="size-4" />
            Choose file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        multiple
        className="hidden"
        onChange={handleSelect}
      />
      {total > 0 ? (
        <div className="grid grid-cols-4 gap-2 pl-8 sm:grid-cols-5">
          {existingReceipts.map((receipt) => (
            <AttachmentTile
              key={receipt.id}
              name={receipt.file_name}
              previewUrl={isImage(receipt.content_type) ? receipt.signedUrl : null}
              href={receipt.signedUrl}
              onRemove={onRemoveExisting ? () => onRemoveExisting(receipt.id) : undefined}
            />
          ))}
          {value.map((file, index) => (
            <AttachmentTile
              key={`${file.name}-${index}`}
              name={file.name}
              previewUrl={isImage(file.type) ? previewUrls[index] : null}
              href={previewUrls[index]}
              onRemove={() => onChange(value.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
