/**
 * Global confirm dialog — a promise-based replacement for `window.confirm()` that
 * renders an Instagram-style action sheet instead of the native browser dialog.
 *
 * Usage (the caller must be async):
 *   import { confirmDialog } from "../lib/confirm";
 *   if (!(await confirmDialog("Удалить этот чат?"))) return;
 *   if (await confirmDialog({ message: "Удалить?", confirmText: "Удалить", destructive: true })) { ... }
 *
 * `<ConfirmHost />` (mounted once in the root layout) subscribes and renders the active dialog.
 */

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button for delete / leave / end actions. */
  destructive?: boolean;
}

export interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

type Listener = (current: PendingConfirm | null) => void;

let queue: PendingConfirm[] = [];
const listeners = new Set<Listener>();
let seq = 1;

function emit() {
  const current = queue[0] ?? null;
  for (const l of listeners) l(current);
}

/** Subscribe a renderer; immediately receives the active dialog (or null). Returns unsubscribe. */
export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue[0] ?? null);
  return () => {
    listeners.delete(listener);
  };
}

/** Show a confirm dialog. Resolves to true (confirmed) or false (cancelled). */
export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const options: ConfirmOptions = typeof opts === "string" ? { message: opts } : opts;
  return new Promise<boolean>((resolve) => {
    queue.push({ id: seq++, ...options, resolve });
    emit();
  });
}

/** Called by the host when the user answers; pops the dialog and resolves its promise. */
export function answerConfirm(id: number, ok: boolean) {
  const idx = queue.findIndex((q) => q.id === id);
  if (idx === -1) return;
  const [item] = queue.splice(idx, 1);
  item.resolve(ok);
  emit();
}
