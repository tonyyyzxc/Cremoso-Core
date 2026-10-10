import { useCallback, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { ToastContext } from "../context/ToastContext.jsx";

const STYLES = {
  success: {
    accent: "border-l-green-500",
    iconColor: "text-green-600",
  },
  error: {
    accent: "border-l-red-500",
    iconColor: "text-red-600",
  },
  info: {
    accent: "border-l-blue-500",
    iconColor: "text-blue-600",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  const toast = useMemo(
    () => ({
      success: (message, duration) => showToast(message, "success", duration),
      error: (message, duration) => showToast(message, "error", duration),
      info: (message, duration) => showToast(message, "info", duration),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map(({ id, message, type }) => {
          const { accent, iconColor } = STYLES[type] || STYLES.info;
          const Icon = type === "success" ? CircleCheck : type === "error" ? CircleAlert : Info;

          return (
            <div
              key={id}
              role="status"
              className={`flex items-start gap-3 rounded-lg border border-l-4 border-neutral-200 bg-white px-4 py-3 shadow-lg ${accent}`}
            >
              <span className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="flex-1 text-sm text-black">{message}</p>
              <button
                onClick={() => removeToast(id)}
                aria-label="Dismiss"
                className="text-neutral-500 hover:text-black"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
