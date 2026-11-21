import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";

const cardClass =
  "rounded-2xl border border-[#E9E2D6] bg-[#FFFCF7] shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass =
  "rounded-xl border border-[#E9E2D6] bg-[#FFFCF7] px-3 py-2.5 text-sm outline-none focus:border-[#0A8B8E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const pageSize = 25;

const categories = [
  "auth",
  "order",
  "menu",
  "user",
  "inventory",
  "branch",
  "drive",
  "config",
  "security",
];

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanize(value) {
  return value ? value.split(".").join(" · ").replaceAll("_", " ") : "Activity";
}

function formatChangedFields(fields) {
  const names = Array.isArray(fields)
    ? fields.filter((field) => typeof field === "string")
    : [];
  return names.length
    ? names.map((field) => field.replace(/([a-z0-9])([A-Z])/g, "$1 $2")).join(", ")
    : "";
}

export default function ActivityLogsPage() {
  const [user] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const isAdmin = user?.role === "admin";
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category: "",
    status: "",
    branchId: "",
    accountId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(isAdmin);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const result = await apiRequest(
        `/api/activity-logs?${params.toString()}`,
      );
      setLogs(result.logs);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    Promise.resolve().then(loadLogs);
  }, [loadLogs, refreshKey]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    Promise.all([apiRequest("/api/branches"), apiRequest("/api/users")])
      .then(([loadedBranches, loadedAccounts]) => {
        if (!active) return;
        setBranches(loadedBranches);
        setAccounts(loadedAccounts);
      })
      .catch((loadError) => {
        if (active) setFilterError(loadError.message);
      })
      .finally(() => {
        if (active) setFiltersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const emptyFilters = {
      from: "",
      to: "",
      category: "",
      status: "",
      branchId: "",
      accountId: "",
    };
    setFilters(emptyFilters);
    setPage(1);
    setAppliedFilters(emptyFilters);
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="mx-auto max-w-7xl space-y-6 text-[#0A3B3D] dark:text-white">
      {!loaded && (
        <p role="status" className="sr-only">
          Loading activity logs...
        </p>
      )}
      <FadeIn from="top">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A7779]">
              System history
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
              Activity Logs
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Review recorded actions and authentication events.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>
      </FadeIn>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {filterError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          Unable to load filter options: {filterError}
        </p>
      )}

      <FadeIn from="left" delay={0.1}>
        <form
          onSubmit={applyFilters}
          className={`${cardClass} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4`}
        >
          <label className="space-y-1.5 text-sm font-medium">
            From
            <span className="relative block">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${inputClass} w-full pl-9`}
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </span>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            To
            <span className="relative block">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${inputClass} w-full pl-9`}
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </span>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Category
            <select
              className={`${inputClass} w-full`}
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {humanize(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Status
            <select
              className={`${inputClass} w-full`}
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </label>

          {isAdmin && (
            <>
              <label className="space-y-1.5 text-sm font-medium">
                Branch
                <select
                  className={`${inputClass} w-full`}
                  value={filters.branchId}
                  onChange={(event) =>
                    updateFilter("branchId", event.target.value)
                  }
                  disabled={filtersLoading}
                >
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Account
                <select
                  className={`${inputClass} w-full`}
                  value={filters.accountId}
                  onChange={(event) =>
                    updateFilter("accountId", event.target.value)
                  }
                  disabled={filtersLoading}
                >
                  <option value="">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name || account.email} ({account.role})
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a]"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-[#E9E2D6] px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-[#F5EFE4] dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
            >
              Clear
            </button>
          </div>
        </form>
      </FadeIn>

      {!loaded ? (
        <div className={`${cardClass} space-y-5 p-5`}>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex gap-4">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <FadeIn from="bottom" delay={0.2}>
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE7DB] px-5 py-4 dark:border-neutral-800">
              <div>
                <h3 className="font-semibold">Recorded activity</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {total} {total === 1 ? "record" : "records"} found
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Newest first
              </p>
            </div>
            {logs.length === 0 ? (
              <p className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No activity logs match these filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-250 text-left text-sm">
                  <thead className="bg-[#F5EFE4] text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">When</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3">Branch</th>
                      <th className="px-5 py-3">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {log.actorName || "System / unknown"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {[log.actorEmail, log.actorRole]
                              .filter(Boolean)
                              .join(" · ") || "No account details"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                          {log.branchId?.name || "—"}
                        </td>
                        <td className="max-w-100 px-5 py-4">
                          <p className="font-medium">
                            {log.summary || humanize(log.action)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {humanize(log.action)}
                          </p>
                          {formatChangedFields(log.details?.changedFields) && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Changed fields: {formatChangedFields(log.details.changedFields)}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[#EFE7DB] px-5 py-3 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={loading || page <= 1}
                  aria-label="Previous page"
                  className="rounded-lg border border-[#E9E2D6] p-2 text-gray-600 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-300"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={loading || page >= pageCount}
                  aria-label="Next page"
                  className="rounded-lg border border-[#E9E2D6] p-2 text-gray-600 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-300"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>
        </FadeIn>
      )}
      {!loaded && <StreakBar />}
    </section>
  );
}
