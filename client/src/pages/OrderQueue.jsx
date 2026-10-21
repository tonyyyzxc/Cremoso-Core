import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Clock3, RefreshCw } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const cardClass =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:cursor-not-allowed disabled:opacity-50";

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrderQueuePage() {
  const [orders, setOrders] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [action, setAction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async () => {
    setError("");
    try {
      setOrders(await apiRequest("/api/orders/queue"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const refreshTimer = window.setInterval(loadQueue, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [loadQueue]);

  useEffect(() => {
    apiRequest("/api/store-config")
      .then((config) => {
        const activeMethods = (config.paymentMethods || []).filter((entry) => entry.active);
        setPaymentMethods(activeMethods);
        setPaymentMethod(activeMethods[0]?.key || "");
      })
      .catch((err) => setError(err.message));
  }, []);

  const openPaymentConfirmation = (order) => {
    setAction({ type: "payment", order });
    setReason("");
    setMessage("");
  };

  const openVoidConfirmation = (order) => {
    setAction({ type: "void", order });
    setReason("");
    setMessage("");
  };

  const closeAction = () => {
    if (busy) return;
    setAction(null);
    setReason("");
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const isPayment = action.type === "payment";
      const updatedOrder = await apiRequest(
        isPayment
          ? `/api/orders/queue/${action.order._id}/confirm-payment`
          : `/api/orders/queue/${action.order._id}/void`,
        {
          method: "POST",
          body: JSON.stringify(isPayment ? { paymentMethod } : { reason }),
        },
      );
      setOrders((current) => current.filter((order) => order._id !== updatedOrder._id));
      setMessage(isPayment ? "Payment confirmed." : "Pending order cancelled and stock restored.");
      setAction(null);
      setReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-[#0A3B3D] dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">Branch point of sale</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Order queue</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Confirm payments or cancel pending orders. This queue refreshes every 15 seconds.
          </p>
        </div>
        <button type="button" onClick={loadQueue} className={primaryButtonClass}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}

      {loading ? (
        <div className={`${cardClass} p-8 text-center text-sm text-gray-500`}>Loading pending orders…</div>
      ) : !orders.length ? (
        <div className={`${cardClass} px-6 py-14 text-center`}>
          <Clock3 className="mx-auto text-gray-400" size={28} />
          <h3 className="mt-3 font-semibold">Queue is clear</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">New orders awaiting payment will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order._id} className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0A8B8E]">{order.orderNumber}</p>
                  <h3 className="mt-1 text-lg font-semibold">{order.customer || "Walk-in"}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {order.channel} <span className="px-1">·</span> {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Awaiting payment
                </span>
              </div>

              <div className="divide-y divide-gray-100 px-5 dark:divide-neutral-800">
                {order.items.map((item, index) => (
                  <div key={`${order._id}-${index}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{item.quantity} × {item.name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {[item.variant?.name, ...(item.addons || []).map((addon) => addon.menuItemId ? `${addon.quantity} × ${addon.name}` : addon.name)].filter(Boolean).join(" · ") || "Regular"}
                      </p>
                    </div>
                    <span className="font-medium">{money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 dark:border-neutral-800">
                <p className="text-lg font-semibold">Total <span className="ml-2">{money(order.total)}</span></p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openVoidConfirmation(order)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
                    <Ban size={16} /> Cancel order
                  </button>
                  <button type="button" onClick={() => openPaymentConfirmation(order)} disabled={!paymentMethods.length} className={primaryButtonClass}>
                    <Check size={16} /> Confirm payment
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAction(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="queue-action-title" className={`${cardClass} w-full max-w-md p-6`}>
            <h3 id="queue-action-title" className="text-xl font-semibold">
              {action.type === "payment" ? "Confirm payment" : "Cancel pending order"}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {action.order.orderNumber} · {money(action.order.total)}
            </p>
            <form onSubmit={submitAction} className="mt-5 space-y-4">
              {action.type === "payment" ? (
                <label className="block space-y-1.5 text-sm font-medium">
                  Payment method
                  <select className={inputClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required>
                    {paymentMethods.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="block space-y-1.5 text-sm font-medium">
                  Cancellation reason
                  <textarea className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} required />
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700">Keep order</button>
                <button type="submit" disabled={busy || (action.type === "payment" && !paymentMethod)} className={primaryButtonClass}>
                  {busy ? "Saving…" : action.type === "payment" ? "Confirm payment" : "Cancel order"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
