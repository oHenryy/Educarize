import { useCallback, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastType } from "./toast-context";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Contador em vez de Date.now(): dois toasts no mesmo milissegundo teriam a mesma key.
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
