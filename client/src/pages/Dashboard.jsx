import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Building2, CircleAlert, ClipboardCheck, RefreshCw, ShoppingBag, TrendingUp } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getSevenDayStart(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 6);
  return date.toISOString().slice(0, 10);
}

function getDateKeys(from, to) {
  const dates = [];
  const current = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className={`${cardClass} flex items-center gap-4 p-5`}>
      <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]"><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
        {detail && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
      </div>
    </article>
  );
}

function getRevenueAndCount(sales, onlineOrders) {
  const salesRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const onlineRevenue = onlineOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return {
    revenue: salesRevenue + onlineRevenue,
    saleCount: sales.length,
    onlineOrderCount: onlineOrders.length,
  };
}

function buildDailyTrend(sales, onlineOrders, from, to) {
  const byDate = new Map(getDateKeys(from, to).map((date) => [date, {
    date,
    staffRevenue: 0,
    onlineRevenue: 0,
    staffCount: 0,
    onlineCount: 0,
  }]));
  for (const sale of sales) {
    const day = byDate.get(sale.businessDate);
    if (!day) continue;
    day.staffRevenue += Number(sale.total || 0);
    day.staffCount += 1;
  }
  for (const order of onlineOrders) {
    const date = getManilaDateKey(new Date(order.updatedAt));
    const day = byDate.get(date);
    if (!day) continue;
    day.onlineRevenue += Number(order.total || 0);
    day.onlineCount += 1;
  }
  return [...byDate.values()];
}

function TrendChart({ title, data, staffKey, onlineKey, currency = false }) {
  const max = Math.max(1, ...data.map((entry) => entry[staffKey] + entry[onlineKey]));
  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Last 7 days · refreshes every minute</p>
        </div>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#0A8B8E]" />Staff sales</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#F2C879]" />Online orders</span>
        </div>
      </div>
      <div className="mt-5 flex h-48 items-end gap-2 border-b border-gray-200 pb-2 dark:border-neutral-700">
        {data.map((entry) => {
          const staffValue = entry[staffKey];
          const onlineValue = entry[onlineKey];
          const staffHeight = (staffValue / max) * 100;
          const onlineHeight = (onlineValue / max) * 100;
          const total = staffValue + onlineValue;
          return (
            <div key={entry.date} title={`${entry.date}: ${currency ? money(total) : `${total} sales`}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="flex h-full items-end justify-center gap-1">
                <div className="w-3 rounded-t bg-[#0A8B8E]" style={{ height: staffHeight ? `${staffHeight}%` : "2px" }} />
                <div className="w-3 rounded-t bg-[#F2C879]" style={{ height: onlineHeight ? `${onlineHeight}%` : "2px" }} />
              </div>
              <span className="mt-2 text-center text-[10px] text-gray-500">{entry.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getBranchPerformance(branches, sales, onlineOrders) {
  const branchSummary = new Map(branches.map((branch) => [branch._id, {
    id: branch._id,
    name: branch.name,
    revenue: 0,
    staffSales: 0,
    onlineOrders: 0,
  }]));
  for (const sale of sales) {
    const summary = branchSummary.get(sale.branchId?._id);
    if (!summary) continue;
    summary.revenue += Number(sale.total || 0);
    summary.staffSales += 1;
  }
  for (const order of onlineOrders) {
    const summary = branchSummary.get(order.branchId?._id);
    if (!summary) continue;
    summary.revenue += Number(order.total || 0);
    summary.onlineOrders += 1;
  }
  return [...branchSummary.values()].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
}

function Dashboard() {
  const [user] = useState(getStoredUser);
  const [report, setReport] = useState({ sales: [], onlineOrders: [], branches: [] });
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const businessDate = useMemo(() => getManilaDateKey(), []);
  const weekStart = useMemo(() => getSevenDayStart(businessDate), [businessDate]);

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ from: weekStart, to: businessDate });
      const [reportData, branchData] = await Promise.all([
        apiRequest(`/api/reports?${params.toString()}`),
        isAdmin ? Promise.resolve(null) : apiRequest("/api/staff/branch"),
      ]);
      setReport({
        sales: reportData.sales || [],
        onlineOrders: reportData.onlineOrders || [],
        branches: reportData.branches || [],
      });
      setBranchName(branchData?.branch?.name || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [businessDate, weekStart, isAdmin]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadDashboard(); });
    const refreshId = window.setInterval(loadDashboard, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, [loadDashboard]);

  const todaySales = useMemo(
    () => report.sales.filter((sale) => sale.businessDate === businessDate),
    [report.sales, businessDate],
  );
  const todayOnlineOrders = useMemo(
    () => report.onlineOrders.filter((order) => getManilaDateKey(new Date(order.updatedAt)) === businessDate),
    [report.onlineOrders, businessDate],
  );
  const totals = useMemo(() => getRevenueAndCount(todaySales, todayOnlineOrders), [todaySales, todayOnlineOrders]);
  const dailyTrend = useMemo(
    () => buildDailyTrend(report.sales, report.onlineOrders, weekStart, businessDate),
    [report.sales, report.onlineOrders, weekStart, businessDate],
  );
  const branchPerformance = useMemo(
    () => getBranchPerformance(report.branches, todaySales, todayOnlineOrders),
    [report.branches, todaySales, todayOnlineOrders],
  );
  const totalTransactions = totals.saleCount + totals.onlineOrderCount;

  return (
    <section className="mx-auto max-w-[1500px] space-y-6 text-[#0A3B3D] dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">{isAdmin ? "Company overview" : "Staff workspace"}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {isAdmin ? "Today’s sales and branch performance." : `${branchName || "Your branch"} · Today’s shift activity.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{businessDate}</span>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <CircleAlert size={17} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {isAdmin ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Revenue today" value={money(totals.revenue)} detail="Staff sales + completed online orders" icon={TrendingUp} />
            <MetricCard label="Total transactions" value={totalTransactions.toLocaleString()} detail={`${totals.saleCount} staff · ${totals.onlineOrderCount} online`} icon={ShoppingBag} />
            <MetricCard label="Completed online orders" value={totals.onlineOrderCount.toLocaleString()} detail="Across all branches today" icon={ClipboardCheck} />
            <MetricCard label="Branches" value={report.branches.length.toLocaleString()} detail="Reporting branches" icon={Building2} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <TrendChart title="Revenue trend" data={dailyTrend} staffKey="staffRevenue" onlineKey="onlineRevenue" currency />
            <TrendChart title="Sales trend" data={dailyTrend} staffKey="staffCount" onlineKey="onlineCount" />
          </div>

          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
              <div>
                <h3 className="font-semibold">Branch performance</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ranked by today’s staff and online sales revenue</p>
              </div>
              <Link to="/reports" className="text-sm font-semibold text-[#0A8B8E] hover:underline">View reports</Link>
            </div>
            {loading && !report.branches.length ? (
              <p className="p-8 text-center text-sm text-gray-500">Loading branch performance…</p>
            ) : branchPerformance.length ? (
              <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {branchPerformance.map((branch, index) => (
                  <article key={branch.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A8B8E]/10 text-sm font-bold text-[#0A8B8E]">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{branch.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{branch.staffSales} staff sales · {branch.onlineOrders} online orders</p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold">{money(branch.revenue)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-gray-500">No branches found.</p>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Shift revenue" value={money(totals.revenue)} detail="Staff sales + completed online orders" icon={TrendingUp} />
            <MetricCard label="Completed online orders" value={totals.onlineOrderCount.toLocaleString()} detail="Completed at this branch today" icon={ClipboardCheck} />
            <MetricCard label="Staff-logged sales" value={totals.saleCount.toLocaleString()} detail="Recorded for today" icon={ShoppingBag} />
            <MetricCard label="Total transactions" value={totalTransactions.toLocaleString()} detail="Online orders + staff sales" icon={BarChart3} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <TrendChart title="Revenue trend" data={dailyTrend} staffKey="staffRevenue" onlineKey="onlineRevenue" currency />
            <TrendChart title="Sales trend" data={dailyTrend} staffKey="staffCount" onlineKey="onlineCount" />
          </div>
          <section className={`${cardClass} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]"><Building2 size={20} /></span>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your branch</p>
                  <h3 className="mt-0.5 text-lg font-semibold">{branchName || "Branch not assigned"}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dashboard figures refresh automatically every minute.</p>
                </div>
              </div>
              <Link to="/reports" className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a]"><BarChart3 size={17} /> Open reports</Link>
            </div>
          </section>
        </>
      )}
      {loading && <p className="text-center text-xs text-gray-500 dark:text-gray-400">Updating dashboard…</p>}
    </section>
  );
}

export default Dashboard;
