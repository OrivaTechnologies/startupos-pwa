"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function ProjectAvatarPicker({
  name,
  existingUrl,
  onFileChange,
  onRemoveExisting,
}: {
  name: string;
  existingUrl: string | null;
  onFileChange: (file: File | null) => void;
  onRemoveExisting: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    onFileChange(file);
  }

  function handleRemove() {
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileChange(null);
    onRemoveExisting();
  }

  const displayUrl = previewUrl ?? existingUrl;

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16 border border-border">
        {displayUrl ? <AvatarImage src={displayUrl} alt={name} /> : null}
        <AvatarFallback className="bg-secondary text-lg text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <Camera className="size-3.5" />
          {displayUrl ? "Change image" : "Upload image"}
        </button>
        {displayUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
      />
    </div>
  );
}
