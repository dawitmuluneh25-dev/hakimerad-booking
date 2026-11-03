import { useState } from "react";
import { api, useMutation } from "@/lib/api.ts";
import { toast } from "sonner";
import type { Id } from "@/lib/ids.ts";
import {
  ALLOWED_FILE_TYPES,
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  type DocumentKind,
} from "@/shared/referrals.ts";
import { errorMessage } from "@/lib/errors.ts";

export type UploadItem = {
  localId: string;
  fileName: string;
  size: number;
  kind: DocumentKind;
  status: "uploading" | "done" | "error";
  storageId?: Id<"_storage">;
};

/** Uploads files to private storage as soon as they are picked; they attach on submit. */
export function useDocumentUploads(existingCount = 0) {
  const discardUpload = useMutation(api.referrals.discardUpload);
  const [items, setItems] = useState<UploadItem[]>([]);

  const patch = (localId: string, fields: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...fields } : i)));

  const uploadOne = async (file: File, localId: string) => {
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { storageId?: string; message?: string };
      if (!response.ok || !payload.storageId) {
        throw new Error(payload.message ?? "Upload failed");
      }
      patch(localId, { status: "done", storageId: payload.storageId });
    } catch (error) {
      patch(localId, { status: "error" });
      toast.error(errorMessage(error, `Could not upload ${file.name}.`));
    }
  };

  const addFiles = (files: FileList | File[], kind: DocumentKind) => {
    const list = Array.from(files);
    const room = MAX_DOCUMENTS - existingCount - items.length;
    if (list.length > room) {
      toast.error(`You can attach up to ${MAX_DOCUMENTS} documents per request.`);
    }
    for (const file of list.slice(0, Math.max(room, 0))) {
      if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`${file.name}: only PDF, JPEG, PNG or WebP files are accepted.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 15 MB.`);
        continue;
      }
      const localId = crypto.randomUUID();
      setItems((prev) => [...prev, { localId, fileName: file.name, size: file.size, kind, status: "uploading" }]);
      void uploadOne(file, localId);
    }
  };

  const remove = (localId: string) => {
    const item = items.find((i) => i.localId === localId);
    setItems((prev) => prev.filter((i) => i.localId !== localId));
    if (item?.storageId) void discardUpload({ storageId: item.storageId }).catch(() => undefined);
  };

  const setKind = (localId: string, kind: DocumentKind) => patch(localId, { kind });

  const ready = items.flatMap((i) =>
    i.status === "done" && i.storageId ? [{ storageId: i.storageId, fileName: i.fileName, kind: i.kind }] : [],
  );

  return {
    items,
    ready,
    isUploading: items.some((i) => i.status === "uploading"),
    hasErrors: items.some((i) => i.status === "error"),
    addFiles,
    remove,
    setKind,
    clear: () => setItems([]),
  };
}

export type DocumentUploads = ReturnType<typeof useDocumentUploads>;
