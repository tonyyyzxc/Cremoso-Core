import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  BarChart3,
  Building2,
  CircleAlert,
  ClipboardCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import {
  FadeIn,
  Skeleton,
  StreakBar,
} from "../components/loading.jsx";
import { fadeTransition, riseIn, staggerContainer } from "../components/loadingVariants.js";

const cardClass =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

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
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <motion.article
      variants={riseIn}
      className={`${cardClass} flex items-center gap-4 p-5`}
    >
      <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
        {detail && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {detail}
          </p>
        )}
      </div>
    </motion.article>
  );
}

function getRevenueAndCount(sales, onlineOrders) {
  const salesRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0,
  );
  const onlineRevenue = onlineOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  return {
    revenue: salesRevenue + onlineRevenue,
    saleCount: sales.length,
    onlineOrderCount: onlineOrders.length,
  };
}

function buildDailyTrend(sales, onlineOrders, from, to) {
  const byDate = new Map(
    getDateKeys(from, to).map((date) => [
      date,
      {
        date,
        staffRevenue: 0,
        onlineRevenue: 0,
        staffCount: 0,
        onlineCount: 0,
      },
    ]),
  );
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
  const [visibleSeries, setVisibleSeries] = useState({ staff: true, online: true });
  const [activeBar, setActiveBar] = useState(null);
  const chartData = data || [];
  const visibleValues = chartData.flatMap((entry) => [
    ...(visibleSeries.staff ? [Number(entry[staffKey] || 0)] : []),
    ...(visibleSeries.online ? [Number(entry[onlineKey] || 0)] : []),
  ]);
  const largestValue = Math.max(0, ...visibleValues);
  let axisStep;
  let axisMaximum;

  if (currency && largestValue > 0) {
    const roughStep = largestValue / 4;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    axisStep = Math.ceil(roughStep / magnitude) * magnitude;
    axisMaximum = axisStep * 4;
  } else if (currency) {
    axisStep = 0.25;
    axisMaximum = 1;
  } else {
    axisStep = Math.max(1, Math.ceil(largestValue / 4));
    axisMaximum = Math.max(2, Math.ceil(Math.max(largestValue, 2) / axisStep) * axisStep);
  }

  const ticks = Array.from(
    { length: Math.round(axisMaximum / axisStep) + 1 },
    (_, index) => axisMaximum - index * axisStep,
  );
  const tooltipId = `dashboard-chart-tooltip-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const formatValue = (value) => currency ? money(value) : Number(value || 0).toLocaleString("en-PH");
  const formatAxisValue = (value) => currency
    ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }).format(value)
    : Math.round(value).toLocaleString("en-PH");
  const formatDate = (date) => new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

  const toggleSeries = (series) => {
    setVisibleSeries((current) => ({ ...current, [series]: !current[series] }));
    setActiveBar((current) => current?.series === series ? null : current);
  };

  const renderBar = (entry, series, value, index) => {
    if (!visibleSeries[series]) return null;
    const barId = `${entry.date}-${series}`;
    const isActive = activeBar?.id === barId;
    const isDimmed = activeBar && !isActive;
    const height = value > 0 ? Math.max((value / axisMaximum) * 100, 1) : 0;
    const label = series === "staff" ? "Staff sales" : "Online orders";
    const fill = series === "staff"
      ? "linear-gradient(to top, #08777a, #1aa3a5)"
      : "repeating-linear-gradient(135deg, rgba(255,255,255,.28) 0 2px, transparent 2px 6px), linear-gradient(to top, #d69d48, #f2c879)";

    return (
      <motion.div
        key={barId}
        role="img"
        tabIndex={0}
        aria-label={`${label}, ${formatDate(entry.date)}: ${formatValue(value)}. Staff sales: ${formatValue(entry[staffKey])}. Online orders: ${formatValue(entry[onlineKey])}.`}
        aria-describedby={activeBar?.id === barId ? tooltipId : undefined}
        onMouseEnter={() => setActiveBar({ id: barId, date: entry.date, series })}
        onMouseLeave={(event) => {
          if (document.activeElement !== event.currentTarget) setActiveBar(null);
        }}
        onFocus={() => setActiveBar({ id: barId, date: entry.date, series })}
        onBlur={() => setActiveBar(null)}
        initial={{ height: 0 }}
        animate={{ height: height ? `${height}%` : "2px" }}
        transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.025 }}
        className={`w-3 shrink-0 cursor-help rounded-t outline-none transition-[opacity,transform,filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#0A8B8E] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900 ${isActive ? "z-10 scale-110" : ""} ${isDimmed ? "opacity-45" : "opacity-100"}`}
        style={{ backgroundImage: fill }}
      />
    );
  };

  return (
    <section className={`${cardClass} p-5`} aria-label={`${title} chart`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Last 7 days · refreshes every minute
          </p>
        </div>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <button
            type="button"
            aria-pressed={visibleSeries.staff}
            onClick={() => toggleSeries("staff")}
            className={`flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0A8B8E] ${visibleSeries.staff ? "" : "opacity-50"}`}
          >
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundImage: "linear-gradient(to top, #08777a, #1aa3a5)" }} />
            Staff sales
          </button>
          <button
            type="button"
            aria-pressed={visibleSeries.online}
            onClick={() => toggleSeries("online")}
            className={`flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#F2C879] ${visibleSeries.online ? "" : "opacity-50"}`}
          >
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.28) 0 2px, transparent 2px 6px), linear-gradient(to top, #d69d48, #f2c879)" }} />
            Online orders
          </button>
        </div>
      </div>

      <div className="relative mt-5 h-48">
        <div className="flex h-full gap-2" role="group" aria-label={`${title} data`}>
        <div className="relative h-full w-[4.5rem] shrink-0 text-right text-[10px] text-gray-500 dark:text-gray-400" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 bottom-6">
            {ticks.map((tick) => (
              <span key={tick} className="absolute right-1 -translate-y-1/2 whitespace-nowrap" style={{ top: `${((axisMaximum - tick) / axisMaximum) * 100}%` }}>
                {formatAxisValue(tick)}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-full min-w-0 flex-1 overflow-x-auto border-b border-gray-200 dark:border-neutral-700">
          <div className="relative h-full" style={{ minWidth: `${Math.max(chartData.length * 40, 40)}px` }}>
            <div className="absolute inset-x-0 top-0 bottom-6" aria-hidden="true">
              {ticks.map((tick) => (
                <div key={tick} className="absolute inset-x-0 border-t border-gray-200/70 dark:border-neutral-700/70" style={{ top: `${((axisMaximum - tick) / axisMaximum) * 100}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-stretch gap-2">
              {chartData.map((entry, index) => (
                <div key={entry.date} className="flex h-full min-w-10 flex-1 flex-col">
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0 flex items-end justify-center gap-1">
                      {renderBar(entry, "staff", Number(entry[staffKey] || 0), index)}
                      {renderBar(entry, "online", Number(entry[onlineKey] || 0), index)}
                    </div>
                  </div>
                  <span className="h-6 shrink-0 truncate pt-1 text-center text-[10px] text-gray-500 dark:text-gray-400">
                    {entry.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
        {activeBar && (
          <div id={tooltipId} role="tooltip" className="pointer-events-none absolute left-[calc(50%_+_2.25rem)] top-1 z-20 w-max max-w-[calc(100%_-_1rem)] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-[#0A3B3D] shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
            <p className="mb-1 font-semibold">{formatDate(activeBar.date)}</p>
            <p>Staff sales: {formatValue(chartData.find((entry) => entry.date === activeBar.date)?.[staffKey])}</p>
            <p>Online orders: {formatValue(chartData.find((entry) => entry.date === activeBar.date)?.[onlineKey])}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function getBranchPerformance(branches, sales, onlineOrders) {
  const branchSummary = new Map(
    branches.map((branch) => [
      branch._id,
      {
        id: branch._id,
        name: branch.name,
        revenue: 0,
        staffSales: 0,
        onlineOrders: 0,
      },
    ]),
  );
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
  return [...branchSummary.values()].sort(
    (a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name),
  );
}

function DashboardSkeleton({ isAdmin }) {
  return (
    <>
      <p role="status" className="sr-only">
        Loading dashboard…
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`${cardClass} flex items-center gap-4 p-5`}
          >
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-1 h-8 w-32" />
              <Skeleton className="mt-1 h-4 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className={`${cardClass} p-5`}>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-1 h-4 w-48" />
            <div className="mt-5 flex h-48 items-end gap-2 border-b border-gray-200 pb-2 dark:border-neutral-700">
              {[40, 65, 50, 80, 55, 70, 45].map((height, bar) => (
                <Skeleton
                  key={bar}
                  className="flex-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {isAdmin ? (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-64 max-w-full" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-neutral-800">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-0.5 h-4 w-48 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`${cardClass} flex flex-wrap items-center justify-between gap-4 p-5`}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-0.5 h-7 w-40" />
              <Skeleton className="mt-1 h-4 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      )}
    </>
  );
}

function Dashboard() {
  const [user] = useState(getStoredUser);
  const [report, setReport] = useState({
    sales: [],
    onlineOrders: [],
    branches: [],
  });
  const [staffTransactions, setStaffTransactions] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const businessDate = useMemo(() => getManilaDateKey(), []);
  const weekStart = useMemo(
    () => getSevenDayStart(businessDate),
    [businessDate],
  );

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      if (isStaff) {
        const transactions = await apiRequest(
          `/api/orders/transactions?date=${encodeURIComponent(businessDate)}`,
        );
        setStaffTransactions(transactions);
        setReport({ sales: [], onlineOrders: [], branches: [] });
        return;
      }
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
  }, [businessDate, weekStart, isAdmin, isStaff]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadDashboard();
    });
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
    () =>
      report.onlineOrders.filter(
        (order) => getManilaDateKey(new Date(order.updatedAt)) === businessDate,
      ),
    [report.onlineOrders, businessDate],
  );
  const totals = useMemo(
    () => getRevenueAndCount(todaySales, todayOnlineOrders),
    [todaySales, todayOnlineOrders],
  );
  const dailyTrend = useMemo(
    () =>
      buildDailyTrend(
        report.sales,
        report.onlineOrders,
        weekStart,
        businessDate,
      ),
    [report.sales, report.onlineOrders, weekStart, businessDate],
  );
  const branchPerformance = useMemo(
    () => getBranchPerformance(report.branches, todaySales, todayOnlineOrders),
    [report.branches, todaySales, todayOnlineOrders],
  );
  const totalTransactions = totals.saleCount + totals.onlineOrderCount;
  const staffRevenue = staffTransactions.reduce(
    (total, order) => total + Number(order.total || 0),
    0,
  );

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto max-w-375 space-y-6 text-[#0A3B3D] dark:text-white">
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fadeTransition}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm font-semibold text-[#0A8B8E]">
              {isAdmin
                ? "Company overview"
                : isStaff
                  ? "Staff workspace"
                  : "Branch workspace"}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {isAdmin
                ? "Today’s sales and branch performance."
                : isStaff
                  ? "Your completed orders and revenue for today."
                : `${branchName || "Your branch"} · Today’s shift activity.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {businessDate}
            </span>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </button>
          </div>
        </motion.header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            <CircleAlert size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <DashboardSkeleton isAdmin={isAdmin} />
        ) : isAdmin ? (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <MetricCard
                label="Revenue today"
                value={money(totals.revenue)}
                detail="Staff sales + completed online orders"
                icon={TrendingUp}
              />
              <MetricCard
                label="Total transactions"
                value={totalTransactions.toLocaleString()}
                detail={`${totals.saleCount} staff · ${totals.onlineOrderCount} online`}
                icon={ShoppingBag}
              />
              <MetricCard
                label="Completed online orders"
                value={totals.onlineOrderCount.toLocaleString()}
                detail="Across all branches today"
                icon={ClipboardCheck}
              />
              <MetricCard
                label="Branches"
                value={report.branches.length.toLocaleString()}
                detail="Reporting branches"
                icon={Building2}
              />
            </motion.div>

            <div className="grid gap-5 xl:grid-cols-2">
              <FadeIn from="left" delay={0.15}>
                <TrendChart
                  title="Revenue trend"
                  data={dailyTrend}
                  staffKey="staffRevenue"
                  onlineKey="onlineRevenue"
                  currency
                />
              </FadeIn>
              <FadeIn from="right" delay={0.15}>
                <TrendChart
                  title="Sales trend"
                  data={dailyTrend}
                  staffKey="staffCount"
                  onlineKey="onlineCount"
                />
              </FadeIn>
            </div>

            <FadeIn from="bottom" delay={0.3}>
              <section className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
                  <div>
                    <h3 className="font-semibold">Branch performance</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Ranked by today’s staff and online sales revenue
                    </p>
                  </div>
                  <Link
                    to="/reports"
                    className="text-sm font-semibold text-[#0A8B8E] hover:underline"
                  >
                    View reports
                  </Link>
                </div>
                {branchPerformance.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {branchPerformance.map((branch, index) => (
                      <article
                        key={branch.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A8B8E]/10 text-sm font-bold text-[#0A8B8E]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {branch.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {branch.staffSales} staff sales ·{" "}
                              {branch.onlineOrders} online orders
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold">
                          {money(branch.revenue)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="p-8 text-center text-sm text-gray-500">
                    No branches found.
                  </p>
                )}
              </section>
            </FadeIn>
          </>
        ) : isStaff ? (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <MetricCard
                label="Your completed orders"
                value={staffTransactions.length.toLocaleString()}
                detail="Orders you completed today"
                icon={ShoppingBag}
              />
              <MetricCard
                label="Your sales today"
                value={money(staffRevenue)}
                detail="From your completed orders"
                icon={TrendingUp}
              />
              <MetricCard
                label="Average order"
                value={money(
                  staffTransactions.length
                    ? staffRevenue / staffTransactions.length
                    : 0,
                )}
                detail="Your average completed order"
                icon={ClipboardCheck}
              />
            </motion.div>
            <FadeIn from="bottom" delay={0.3}>
              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
                  <h3 className="font-semibold">Your completed transactions</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Only orders created by your account are shown.
                  </p>
                </div>
                {staffTransactions.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {staffTransactions.slice(0, 8).map((order) => (
                      <article
                        key={order._id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {new Intl.DateTimeFormat("en-PH", {
                              timeZone: "Asia/Manila",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(order.updatedAt))}
                          </p>
                        </div>
                        <span className="font-semibold">{money(order.total)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No completed orders for you today.
                  </p>
                )}
              </section>
            </FadeIn>
          </>
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <MetricCard
                label="Shift revenue"
                value={money(totals.revenue)}
                detail="Staff sales + completed online orders"
                icon={TrendingUp}
              />
              <MetricCard
                label="Completed online orders"
                value={totals.onlineOrderCount.toLocaleString()}
                detail="Completed at this branch today"
                icon={ClipboardCheck}
              />
              <MetricCard
                label="Staff-logged sales"
                value={totals.saleCount.toLocaleString()}
                detail="Recorded for today"
                icon={ShoppingBag}
              />
              <MetricCard
                label="Total transactions"
                value={totalTransactions.toLocaleString()}
                detail="Online orders + staff sales"
                icon={BarChart3}
              />
            </motion.div>
            <div className="grid gap-5 xl:grid-cols-2">
              <FadeIn from="left" delay={0.15}>
                <TrendChart
                  title="Revenue trend"
                  data={dailyTrend}
                  staffKey="staffRevenue"
                  onlineKey="onlineRevenue"
                  currency
                />
              </FadeIn>
              <FadeIn from="right" delay={0.15}>
                <TrendChart
                  title="Sales trend"
                  data={dailyTrend}
                  staffKey="staffCount"
                  onlineKey="onlineCount"
                />
              </FadeIn>
            </div>
            <FadeIn from="bottom" delay={0.3}>
              <section className={`${cardClass} p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]">
                      <Building2 size={20} />
                    </span>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your branch
                      </p>
                      <h3 className="mt-0.5 text-lg font-semibold">
                        {branchName || "Branch not assigned"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Dashboard figures refresh automatically every minute.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/reports"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a]"
                  >
                    <BarChart3 size={17} /> Open reports
                  </Link>
                </div>
              </section>
            </FadeIn>
          </>
        )}
        <AnimatePresence>{loading && <StreakBar />}</AnimatePresence>
      </section>
    </MotionConfig>
  );
}

export default Dashboard;
