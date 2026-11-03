import { useRef, useState } from "react";
import { AlertCircleIcon, CheckCircle2Icon, FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { DOCUMENT_KIND_LABELS, MAX_DOCUMENTS, type DocumentKind } from "@/shared/referrals.ts";
import type { DocumentUploads } from "@/hooks/use-document-uploads.ts";
import { formatBytes } from "../-lib/format.ts";

const KINDS = Object.entries(DOCUMENT_KIND_LABELS) as Array<[DocumentKind, string]>;

function isKind(value: string): value is DocumentKind {
  return value in DOCUMENT_KIND_LABELS;
}

export default function DocumentPicker({ uploads }: { uploads: DocumentUploads }) {
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("referral_letter");
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploads.addFiles(e.dataTransfer.files, kind);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <UploadIcon className="size-6 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Drop files here or choose them</p>
          <p className="text-xs text-muted-foreground">
            PDF, JPEG, PNG or WebP, up to 15 MB each, {MAX_DOCUMENTS} files maximum. Stored privately.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <NativeSelect
            size="sm"
            aria-label="Document type"
            value={kind}
            onChange={(e) => {
              if (isKind(e.target.value)) setKind(e.target.value);
            }}
          >
            {KINDS.map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()}>
            Choose files
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploads.addFiles(e.target.files, kind);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.items.length > 0 ? (
        <ul className="space-y-2">
          {uploads.items.map((item) => (
            <li key={item.localId} className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
              <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {item.status === "uploading" ? <Spinner className="size-3" /> : null}
                  {item.status === "done" ? <CheckCircle2Icon className="size-3 text-emerald-600 dark:text-emerald-400" /> : null}
                  {item.status === "error" ? <AlertCircleIcon className="size-3 text-destructive" /> : null}
                  {item.status === "uploading" ? "Uploading" : item.status === "done" ? "Uploaded" : "Failed, remove and try again"}
                  {" · "}
                  {formatBytes(item.size)}
                </p>
              </div>
              <NativeSelect
                size="sm"
                aria-label={`Type for ${item.fileName}`}
                value={item.kind}
                onChange={(e) => {
                  if (isKind(e.target.value)) uploads.setKind(item.localId, e.target.value);
                }}
              >
                {KINDS.map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.fileName}`}
                onClick={() => uploads.remove(item.localId)}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
