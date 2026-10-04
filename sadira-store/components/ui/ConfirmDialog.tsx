"use client";

import { useEffect, useId, useRef, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small centred confirmation (native modal <dialog>: focus trap, Escape cancels). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onCancel}
      onClick={handleBackdropClick}
      className="sadira-dialog m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-background p-0 text-foreground"
    >
      <div className="p-6">
        <h2 id={titleId} className="font-serif text-xl">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-muted">
            {description}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
          <Button fullWidth onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
