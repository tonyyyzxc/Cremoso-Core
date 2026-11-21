import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  Archive,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useEditLock } from "../hooks/useEditLock.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition, riseIn, staggerContainer } from "../components/loadingVariants.js";

const cardClass = "rounded-2xl border border-[#E9E2D6] bg-[#FFFCF7] shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "rounded-xl border border-[#E9E2D6] bg-[#FFFCF7] px-3 py-2.5 text-sm outline-none focus:border-[#0A8B8E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const statusStyles = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  voided: "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300",
  refunded: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function OrderStatus({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] || statusStyles.pending}`}>{status}</span>;
}

export default function OrdersPage() {
  const editLock = useEditLock();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "all", branchId: "all", from: "", to: "" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [action, setAction] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      if (showArchived) params.set("archived", "true");
      const query = params.toString();
      setOrders(await apiRequest(`/api/orders${query ? `?${query}` : ""}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setOrdersLoaded(true);
    }
  }, [filters, showArchived]);

  useEffect(() => {
    Promise.resolve().then(() => loadOrders());
  }, [loadOrders]);

  useEffect(() => {
    apiRequest("/api/branches")
      .then(setBranches)
      .catch((err) => setError(err.message))
      .finally(() => setBranchesLoaded(true));
  }, []);

  const counts = useMemo(() => ({
    total: orders.length,
    completed: orders.filter((order) => order.status === "completed").length,
    pending: orders.filter((order) => order.status === "pending").length,
    exceptions: orders.filter((order) => ["voided", "refunded"].includes(order.status)).length,
  }), [orders]);

  const openOrder = async (order) => {
    setError("");
    try {
      setSelectedOrder(await apiRequest(`/api/orders/${order._id}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const openAction = async (type, order) => {
    setError("");
    try {
      const acquired = await editLock.acquire("Order", order._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      setAction({ type, order, reason: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const closeAction = async () => {
    if (saving) return;
    setAction(null);
    try {
      await editLock.release();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action) return;
    setSaving(true);
    setError("");
    try {
      if (
        editLock.activeResource?.resourceType !== "Order"
        || editLock.activeResource.resourceId !== action.order._id
      ) {
        const acquired = await editLock.acquire("Order", action.order._id);
        if (!acquired) {
          setError("This record is currently unavailable for editing.");
          return;
        }
      }
      const updated = await apiRequest(`/api/orders/${action.order._id}/${action.type}`, {
        method: "POST",
        body: JSON.stringify({ reason: action.reason }),
      });
      setOrders((current) => current.map((order) => order._id === updated._id ? updated : order));
      if (selectedOrder?._id === updated._id) setSelectedOrder(updated);
      setAction(null);
      await editLock.release();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const archiveOrder = async (order) => {
    setBusyOrderId(order._id);
    setError("");
    try {
      const acquired = await editLock.acquire("Order", order._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      await apiRequest(`/api/orders/${order._id}/archive`, { method: "POST" });
      setOrders((current) => current.filter((item) => item._id !== order._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOrderId("");
      try {
        await editLock.release();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const permanentlyDeleteOrder = async (order) => {
    const confirmation = `Permanently delete archived order ${order.orderNumber}? It will be removed from reports and cannot be restored.`;
    if (!window.confirm(confirmation)) return;
    setBusyOrderId(order._id);
    setError("");
    try {
      const acquired = await editLock.acquire("Order", order._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      await apiRequest(`/api/orders/${order._id}`, { method: "DELETE" });
      setOrders((current) => current.filter((item) => item._id !== order._id));
      if (selectedOrder?._id === order._id) setSelectedOrder(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOrderId("");
      try {
        await editLock.release();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const initialLoading = !ordersLoaded || !branchesLoaded;

  return (
    <MotionConfig reducedMotion="user">
    <section className="mx-auto max-w-7xl space-y-6 text-[#0A3B3D] dark:text-white">
      {initialLoading && <p role="status" className="sr-only">Loading orders...</p>}
      <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A7779]">Admin workspace</p>
          <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Orders</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Review order history, item price snapshots, and void or refund records across branches.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#0A8B8E]/15 bg-[#0A8B8E]/5 px-3.5 py-2.5 text-sm font-medium text-[#0A6B6E] dark:text-teal-300">
          <CalendarDays size={17} /> {counts.total} matching orders
        </div>
      </motion.header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {initialLoading ? <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <div key={index} className={`${cardClass} flex gap-4 p-5`}><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-20" /></div></div>)}</div><div className={`${cardClass} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5`}>{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-10 w-full" />)}</div><div className={`${cardClass} overflow-hidden`}><div className="border-b border-[#EFE7DB] px-5 py-4 dark:border-neutral-800"><Skeleton className="h-5 w-40" /><Skeleton className="mt-2 h-4 w-72" /></div><div className="space-y-4 p-5">{[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="grid grid-cols-7 gap-4"><Skeleton className="col-span-2 h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div>)}</div></div></div> : <>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Orders in view", counts.total, <CircleDollarSign size={19} />],
          ["Completed", counts.completed, <CheckCircle2 size={19} />],
          ["Pending", counts.pending, <CalendarDays size={19} />],
          ["Voided / refunded", counts.exceptions, <RotateCcw size={19} />],
        ].map(([label, value, icon]) => (
          <motion.article key={label} variants={riseIn} className={`${cardClass} flex items-center gap-4 p-5`}>
            <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]">{icon}</span>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
          </motion.article>
        ))}
      </motion.div>

      <FadeIn from="left" delay={0.15}><section className={`${cardClass} p-4`} aria-label="Order filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input className={`${inputClass} w-full pl-9`} aria-label="Search orders" placeholder="Order or customer" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          </label>
          <select className={inputClass} aria-label="Filter by status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="voided">Voided</option><option value="refunded">Refunded</option>
          </select>
          <select className={inputClass} aria-label="Filter by branch" value={filters.branchId} onChange={(event) => updateFilter("branchId", event.target.value)}>
            <option value="all">All branches</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
          </select>
          <label className="text-xs text-gray-500">From<input className={`${inputClass} mt-1 block w-full`} type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} /></label>
          <label className="text-xs text-gray-500">To<input className={`${inputClass} mt-1 block w-full`} type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} /></label>
        </div>
      </section></FadeIn>

      <FadeIn from="bottom" delay={0.3}><section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[#EFE7DB] px-5 py-4 dark:border-neutral-800">
          <div>
            <h3 className="font-semibold">{showArchived ? "Archived orders" : "Order history"}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {showArchived ? "Archived records stay in reports unless permanently deleted." : "Showing up to 500 matching records, newest first."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowArchived((current) => !current)}
              aria-pressed={showArchived}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E9E2D6] px-3 py-2 text-sm font-medium hover:bg-[#F5EFE4] dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <Archive size={16} /> {showArchived ? "Show active orders" : "Show archived"}
            </button>
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-195 text-left text-sm">
            <thead className="bg-[#F5EFE4] text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
              <tr><th className="px-5 py-3 font-semibold">Order</th><th className="px-5 py-3 font-semibold">Branch</th><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Channel / payment</th><th className="px-5 py-3 font-semibold">Total</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
              {!loading && !orders.length && <tr><td colSpan="7" className="px-6 py-14 text-center"><p className="font-medium">{showArchived ? "No archived orders found" : "No order records found"}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{showArchived ? "Orders you archive will appear here." : "Orders will appear here after a checkout flow starts saving transactions."}</p></td></tr>}
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-[#F5EFE4]/70 dark:hover:bg-neutral-800/40">
                  <td className="px-5 py-4"><p className="font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{order.customer || "Walk-in"}</p>{order.archivedAt && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Archived {formatDate(order.archivedAt)}</p>}</td>
                  <td className="px-5 py-4">{order.branchId?.name || "Unknown branch"}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-4"><span className="capitalize">{order.channel}</span><p className="mt-1 text-xs text-gray-500">{order.paymentMethod || "Payment not recorded"}</p></td>
                  <td className="px-5 py-4 font-semibold">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-4"><OrderStatus status={order.status} />{order.archivedAt && <p className="mt-1 text-xs text-gray-500">Archived by {order.archivedBy?.name || order.archivedBy?.email || "Admin"}</p>}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openOrder(order)} title="View order details" className="rounded-lg p-2 text-gray-500 hover:bg-[#F5EFE4] hover:text-[#0A8B8E] dark:hover:bg-neutral-800"><Eye size={17} /></button>
                    {!order.archivedAt && order.status === "pending" && <button type="button" onClick={() => openAction("void", order)} disabled={editLock.isBlocked("Order", order._id)} title="Void pending order" className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"><Ban size={17} /></button>}
                    {!order.archivedAt && order.status === "completed" && <button type="button" onClick={() => openAction("refund", order)} disabled={editLock.isBlocked("Order", order._id)} title="Refund completed order" className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"><RotateCcw size={17} /></button>}
                    {order.archivedAt ? (
                      <button type="button" onClick={() => permanentlyDeleteOrder(order)} disabled={Boolean(busyOrderId) || editLock.isBlocked("Order", order._id)} title="Permanently delete archived order" aria-label={`Permanently delete ${order.orderNumber}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 size={17} /></button>
                    ) : (
                      <button type="button" onClick={() => archiveOrder(order)} disabled={Boolean(busyOrderId) || editLock.isBlocked("Order", order._id)} title="Archive order" aria-label={`Archive ${order.orderNumber}`} className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:hover:bg-amber-950/40"><Archive size={17} /></button>
                    )}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section></FadeIn>
      </>}

      {selectedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className={`${cardClass} max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-gray-500">Order details</p><h3 id="order-detail-title" className="mt-1 text-xl font-semibold">{selectedOrder.orderNumber}</h3></div><button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close order details" className="rounded-lg p-2 text-gray-500 hover:bg-[#F5EFE4] dark:hover:bg-neutral-800"><X size={19} /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs text-gray-500">Branch</p><p className="mt-1 font-medium">{selectedOrder.branchId?.name || "Unknown branch"}</p></div>
              <div><p className="text-xs text-gray-500">Placed</p><p className="mt-1 font-medium">{formatDate(selectedOrder.createdAt)}</p></div>
              <div><p className="text-xs text-gray-500">Channel</p><p className="mt-1 capitalize font-medium">{selectedOrder.channel}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><div className="mt-1"><OrderStatus status={selectedOrder.status} /></div></div>
            </div>
            <div className="mt-6 overflow-x-auto rounded-xl border border-[#E9E2D6] dark:border-neutral-800">
              <table className="w-full min-w-130 text-left text-sm"><thead className="bg-[#F5EFE4] text-xs text-gray-500 dark:bg-neutral-950"><tr><th className="px-4 py-3">Item snapshot</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3 text-right">Line total</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-neutral-800">{selectedOrder.items.map((item, index) => <tr key={`${item.name}-${index}`}><td className="px-4 py-3"><p className="font-medium">{item.name}{item.variant?.name ? ` · ${item.variant.name}` : ""}</p>{item.addons?.length > 0 && <div className="mt-1 space-y-0.5 text-xs text-gray-500">{item.addons.map((addon, addonIndex) => <p key={`${addon.name}-${addonIndex}`}>{addon.menuItemId ? `${addon.quantity} × ${addon.name} (${formatCurrency(addon.price)} each${addon.chargedQuantity < addon.quantity ? `, ${addon.quantity - addon.chargedQuantity} included` : ""})` : addon.name}</p>)}</div>}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td><td className="px-4 py-3 text-right font-medium">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table>
            </div>
            <div className="ml-auto mt-4 max-w-xs space-y-2 text-sm"><div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div><div className="flex justify-between border-t border-[#E9E2D6] pt-2 text-base font-semibold dark:border-neutral-800"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div><p className="text-right text-xs text-gray-500">Payment: {selectedOrder.paymentMethod || "Not recorded"}</p></div>
            {selectedOrder.auditTrail?.length > 0 && <div className="mt-6"><h4 className="font-semibold">Void and refund audit</h4><div className="mt-3 space-y-3">{selectedOrder.auditTrail.map((entry, index) => <div key={`${entry.action}-${index}`} className="rounded-xl bg-[#F5EFE4] p-4 text-sm dark:bg-neutral-950"><p className="font-medium capitalize">{entry.action} · {formatDate(entry.performedAt)}</p><p className="mt-1 text-gray-600 dark:text-gray-300">{entry.reason}</p><p className="mt-2 text-xs text-gray-500">By {entry.performedBy?.name || entry.performedBy?.email || "Administrator"}</p></div>)}</div></div>}
          </section>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={submitAction} className={`${cardClass} w-full max-w-md space-y-4 p-6`}>
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold capitalize">{action.type} order</h3><p className="mt-1 text-sm text-gray-500">{action.order.orderNumber} · {formatCurrency(action.order.total)}</p></div><button type="button" onClick={closeAction} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-[#F5EFE4] dark:hover:bg-neutral-800"><X size={18} /></button></div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{action.type === "void" ? "This will mark the pending order as voided." : "This will record a full refund for the completed order."} Enter a reason to keep the action in the audit history.</p>
            <label className="block space-y-1 text-sm font-medium">Reason<textarea autoFocus required minLength="3" maxLength="500" rows="3" className={`${inputClass} w-full resize-y`} value={action.reason} onChange={(event) => setAction((current) => ({ ...current, reason: event.target.value }))} placeholder="Enter the reason" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={closeAction} className="rounded-xl border border-[#E9E2D6] px-4 py-2 text-sm dark:border-neutral-700">Cancel</button><button disabled={saving || editLock.isBlocked("Order", action.order._id)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? "Saving…" : `Confirm ${action.type}`}</button></div>
          </form>
        </div>
      )}
      <AnimatePresence>{initialLoading && <StreakBar />}</AnimatePresence>
    </section>
    </MotionConfig>
  );
}
