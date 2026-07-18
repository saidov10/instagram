/**
 * Tiny global toast store — a drop-in replacement for `alert()` that renders an
 * Instagram-style dark toast at the bottom of the screen instead of a native dialog.
 *
 * Usage from anywhere (component or not):
 *   import { toast } from "../lib/toast";
 *   toast("Скопировано");                 // neutral
 *   toast("Готово", "success");
 *   toast(err.message, "error");
 *
 * `<ToastHost />` (mounted once in ClientLayout) subscribes and renders the stack.
 */

export type ToastType = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 1;

function emit() {
  for (const l of listeners) l(toasts);
}

/** Subscribe a renderer; immediately receives the current stack. Returns an unsubscribe fn. */
export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Show a toast. Auto-dismisses after `durationMs`. Returns its id. */
export function toast(message: string, type: ToastType = "info", durationMs = 3200): number {
  const id = seq++;
  toasts = [...toasts, { id, message, type }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}
