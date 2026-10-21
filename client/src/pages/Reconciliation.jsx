import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:cursor-not-allowed disabled:opacity-50";

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value)) : "";
}

export default function ReconciliationPage() {
  const [businessDate, setBusinessDate] = useState("");
  const [cashSales, setCashSales] = useState(0);
  const [reconciliation, setReconciliation] = useState(null);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadReconciliation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/reconciliation");
      setBusinessDate(data.businessDate);
      setCashSales(data.reconciliation?.cashSales ?? data.cashSales);
      setReconciliation(data.reconciliation);
      if (data.reconciliation) {
        setOpeningFloat(String(data.reconciliation.openingFloat));
        setCountedCash(String(data.reconciliation.countedCash));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  const calculatedExpected = useMemo(() => {
    const opening = Number(openingFloat);
    if (!Number.isFinite(opening) || opening < 0) return null;
    return Math.round((opening + Number(cashSales) + Number.EPSILON) * 100) / 100;
  }, [openingFloat, cashSales]);

  const calculatedVariance = useMemo(() => {
    const counted = Number(countedCash);
    if (calculatedExpected === null || !Number.isFinite(counted) || counted < 0) return null;
    return Math.round((counted - calculatedExpected + Number.EPSILON) * 100) / 100;
  }, [calculatedExpected, countedCash]);

  const submitReconciliation = async (event) => {
    event.preventDefault();
    const opening = Number(openingFloat);
    const counted = Number(countedCash);
    if (!Number.isFinite(opening) || opening < 0 || !Number.isFinite(counted) || counted < 0) {
      setError("Enter valid non-negative cash amounts.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await apiRequest("/api/reconciliation", {
        method: "POST",
        body: JSON.stringify({ openingFloat: opening, countedCash: counted }),
      });
      setCashSales(data.reconciliation.cashSales);
      setReconciliation(data.reconciliation);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isSubmitted = Boolean(reconciliation);
  const variance = isSubmitted ? reconciliation.variance : calculatedVariance;

  return (
    <section className="mx-auto max-w-5xl space-y-6 text-[#0A3B3D] dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">Branch closeout</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Shift Reconciliation</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Compare expected cash for today with the amount counted in the register.</p>
        </div>
        <button type="button" onClick={loadReconciliation} disabled={loading} className={buttonClass}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {loading ? <div className={`${cardClass} p-8 text-center text-sm text-gray-500`}>Loading today’s reconciliation...</div> : (
        <>
          <section className={`${cardClass} p-5`}>
            <div className="flex items-start gap-3"><span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]"><ClipboardCheck size={20} /></span><div><h3 className="font-semibold">Business date</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{businessDate}</p><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Expected cash is opening float plus cash from staff-entered sales and completed online orders. Other payment methods are excluded.</p></div></div>
          </section>

          <form onSubmit={submitReconciliation} className={`${cardClass} space-y-5 p-5 sm:p-6`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">Opening cash float
                <input className={inputClass} type="number" min="0" step="0.01" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} disabled={isSubmitted} required />
              </label>
              <label className="space-y-1.5 text-sm font-medium">Cash counted in drawer
                <input className={inputClass} type="number" min="0" step="0.01" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} disabled={isSubmitted} required />
              </label>
            </div>

            <div className="grid gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-950 sm:grid-cols-3">
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Cash sales</p><p className="mt-1 text-lg font-semibold">{money(cashSales)}</p></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Expected cash</p><p className="mt-1 text-lg font-semibold">{money(isSubmitted ? reconciliation.expectedCash : calculatedExpected)}</p></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Difference</p><p className={`mt-1 text-lg font-semibold ${Number(variance) === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{variance === null ? "Enter counted cash" : money(variance)}</p></div>
            </div>

            {isSubmitted ? (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span className="inline-flex items-center gap-2 font-medium"><CheckCircle2 size={17} /> Reconciliation submitted</span>
                <span>{reconciliation.submittedBy?.name || reconciliation.submittedBy?.email || "Staff"}{reconciliation.submittedAt ? ` · ${formatDate(reconciliation.submittedAt)}` : ""}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">You can submit one reconciliation for this branch today.</p>
                <button type="submit" disabled={saving || calculatedVariance === null} className={buttonClass}>{saving ? "Submitting..." : "Submit reconciliation"}</button>
              </div>
            )}
          </form>
        </>
      )}
    </section>
  );
}
