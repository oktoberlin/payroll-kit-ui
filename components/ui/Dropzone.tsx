"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

/** Click-to-browse or drag-and-drop a single file. */
export function Dropzone({ onFile, accept = ".csv", hint }: { onFile: (file: File) => void; accept?: string; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload CSV file"
      onClick={() => input.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        over ? "border-primary-fg bg-primary-soft" : "border-line-strong bg-surface",
      )}
    >
      <span className="grid size-12 place-items-center rounded-xl border border-line bg-surface text-primary-fg shadow-1">
        <Icon name="file-up" size={22} />
      </span>
      <span className="text-[15px] font-semibold">{over ? "Drop to validate" : "Drag a CSV file here"}</span>
      <span className="text-ink-2">
        or <span className="font-medium text-primary-fg underline underline-offset-2">browse files</span> · {hint}
      </span>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
