import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { useDocumentUploads } from "@/hooks/use-document-uploads.ts";
import { errorMessage } from "@/lib/errors.ts";
import DocumentPicker from "./document-picker.tsx";

export function AddDocumentsDialog({
  referralId,
  existingCount,
  open,
  onOpenChange,
}: {
  referralId: Id<"referrals">;
  existingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const uploads = useDocumentUploads(existingCount);
  const addDocuments = useMutation(api.referrals.addDocuments);
  const [saving, setSaving] = useState(false);

  const close = () => {
    for (const item of uploads.items) uploads.remove(item.localId);
    onOpenChange(false);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await addDocuments({ referralId, documents: uploads.ready });
      uploads.clear();
      toast.success("Documents added");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not add the documents."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add documents</DialogTitle>
          <DialogDescription>Attach additional reports or letters to this request.</DialogDescription>
        </DialogHeader>
        <DocumentPicker uploads={uploads} />
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || uploads.isUploading || uploads.ready.length === 0}>
            {saving ? <Spinner /> : null}
            Attach {uploads.ready.length > 0 ? uploads.ready.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WithdrawDialog({
  referralId,
  reference,
  open,
  onOpenChange,
}: {
  referralId: Id<"referrals">;
  reference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const withdraw = useMutation(api.referrals.withdraw);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const onConfirm = async () => {
    setSaving(true);
    try {
      await withdraw({ referralId, reason });
      toast.success("Request withdrawn");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not withdraw the request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw request {reference}?</DialogTitle>
          <DialogDescription>The clinical team will stop reviewing it. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="withdraw-reason">Reason</Label>
          <Textarea
            id="withdraw-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Procedure is being arranged at another facility."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep request
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving || reason.trim().length < 2}>
            {saving ? <Spinner /> : null}
            Withdraw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
