"use client";

// One confirmation dialog, mounted once in the layout; anything can ask it a
// question and await the answer, the way it would await window.confirm().

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type ConfirmRequest = ConfirmOptions & { resolve: (ok: boolean) => void };

const EVENT = "rj:confirm";
let listeners = 0;

/** Resolves true if the person confirms, false if they cancel or close the dialog. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // The dialog isn't mounted (it always is in the app): fall back to the browser's own.
    if (listeners === 0) return resolve(window.confirm(options.description ? `${options.title}\n\n${options.description}` : options.title));
    let settled = false;
    const once = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(EVENT, { detail: { ...options, resolve: once } }));
  });
}

export function onConfirmRequest(listener: (request: ConfirmRequest) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<ConfirmRequest>).detail);
  window.addEventListener(EVENT, handler);
  listeners++;
  return () => {
    window.removeEventListener(EVENT, handler);
    listeners--;
  };
}
