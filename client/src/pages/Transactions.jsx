import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition } from "../components/loadingVariants.js";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0A8B8E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TransactionsPage() {
  const [date, setDate] = useState(getManilaDate);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await apiRequest(`/api/orders/transactions?date=${encodeURIComponent(date)}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [date]);

  useEffect(() => {
    Promise.resolve().then(() => loadTransactions());
  }, [loadTransactions]);

  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <MotionConfig reducedMotion="user">
    <section className="mx-auto max-w-7xl space-y-6 text-[#0A3B3D] dark:text-white">
      {!initialLoaded && <p role="status" className="sr-only">Loading transactions...</p>}
      <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">Branch sales</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Completed orders for your branch, grouped by the time payment was confirmed.</p>
        </div>
        <button type="button" onClick={loadTransactions} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </motion.header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {!initialLoaded ? <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2"><div className={`${cardClass} flex items-center gap-4 p-5`}><Skeleton className="h-11 w-11 rounded-xl" /><Skeleton className="h-10 w-56" /></div><div className={`${cardClass} space-y-2 p-5`}><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-20" /><Skeleton className="h-4 w-36" /></div></div>
        <div className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><Skeleton className="h-5 w-48" /><Skeleton className="mt-2 h-4 w-72" /></div><div className="space-y-5 p-5">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex gap-4"><Skeleton className="h-5 flex-1" /><Skeleton className="h-5 flex-1" /><Skeleton className="h-5 flex-1" /></div>)}</div></div>
      </div> : <>
      <FadeIn from="left" delay={0.15}><div className="grid gap-4 sm:grid-cols-2">
        <section className={`${cardClass} flex items-center gap-4 p-5`}>
          <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]"><CalendarDays size={20} /></span>
          <label className="flex flex-wrap items-center gap-3 text-sm font-medium">Transaction date
            <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </section>
        <article className={`${cardClass} p-5`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed sales</p>
          <p className="mt-1 text-2xl font-semibold">{orders.length}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total {money(total)}</p>
        </article>
      </div></FadeIn>

      <FadeIn from="bottom" delay={0.3}><section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
          <h3 className="font-semibold">Completed transactions</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Payment method and completion time are recorded for each order.</p>
        </div>
        {!orders.length ? (
          <p className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No completed transactions for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Completed at</th><th className="px-5 py-3">Channel</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {orders.map((order) => <tr key={order._id}>
                  <td className="px-5 py-4"><p className="font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{order.customer || "Walk-in"}</p></td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{formatDate(order.updatedAt)}</td>
                  <td className="px-5 py-4 capitalize">{order.channel}</td>
                  <td className="px-5 py-4"><div className="space-y-1">{order.items.map((item, index) => <p key={`${order._id}-${index}`}>{item.quantity} × {item.name}{item.variant?.name ? ` · ${item.variant.name}` : ""}</p>)}</div></td>
                  <td className="px-5 py-4">{order.paymentMethod || "Not recorded"}</td>
                  <td className="px-5 py-4 text-right font-semibold">{money(order.total)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section></FadeIn>
      </>}
      <AnimatePresence>{!initialLoaded && <StreakBar />}</AnimatePresence>
    </section>
    </MotionConfig>
  );
}
