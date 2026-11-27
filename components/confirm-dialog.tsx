"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { onConfirmRequest, type ConfirmRequest } from "@/lib/confirm";

/** Answers confirmAction(). Lives once in the layout. */
export function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      onConfirmRequest((next) => {
        setRequest((previous) => {
          previous?.resolve(false);
          return next;
        });
        setOpen(true);
      }),
    [],
  );

  // The request stays set while the dialog animates out.
  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && answer(false)}>
      {request && (
        <DialogContent className="max-w-sm">
          <div className="grid gap-1.5 pr-8">
            <DialogTitle>{request.title}</DialogTitle>
            {request.description && <DialogDescription className="text-base text-pretty">{request.description}</DialogDescription>}
          </div>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="h-11 rounded-full px-5" onClick={() => answer(false)}>
              {request.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={request.destructive ? "destructive" : "default"}
              className="h-11 rounded-full px-5"
              onClick={() => answer(true)}
            >
              {request.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
