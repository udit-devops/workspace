import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "info";
export interface Toast { id: number; tone: ToastTone; title: string; body?: string }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback((tone: ToastTone, title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, title, body }]);
    // Errors stay longer so there is time to read git's output.
    timers.current.set(id, setTimeout(() => dismiss(id), tone === "error" ? 9000 : 3800));
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  return { toasts, push, dismiss };
}
