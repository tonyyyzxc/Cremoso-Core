import { useCallback, useEffect, useState } from "react";
import { Building2, Mail, Phone, Users } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const statusClass = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  invited:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  disabled: "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [user] = useState(getStoredUser);
  const [branchData, setBranchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isStaff = user?.role === "staff";

  const loadBranchData = useCallback(async () => {
    const data = await apiRequest("/api/staff/branch");
    setBranchData(data);
  }, []);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    loadBranchData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isStaff, loadBranchData]);

  if (!isStaff) {
    return <p>Dashboard page is not implemented yet.</p>;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-[#0A3B3D] dark:text-white">
      <header>
        <p className="text-sm font-semibold text-[#0A8B8E]">Staff workspace</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">
          Your branch
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Find the people assigned to your branch and their account contact
          details.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-400">
          Loading your branch team...
        </div>
      ) : branchData?.branch ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-5 dark:border-neutral-800 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {branchData.branch.name}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {branchData.coworkers.length} staff account
                  {branchData.coworkers.length === 1 ? "" : "s"} assigned
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs font-semibold text-[#8A641B] dark:bg-neutral-800 dark:text-amber-200">
              <Users size={15} /> Branch team
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-neutral-800">
            {branchData.coworkers.map((coworker) => (
              <article
                key={coworker._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A8B8E]/10 font-semibold text-[#0A8B8E]">
                    {(coworker.name || coworker.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {coworker.name || "Name not provided"}
                      {coworker.email === user.email && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          You
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <Mail size={14} /> {coworker.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-[3.25rem] sm:pl-0">
                  <p className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <Phone size={14} /> {coworker.phone || "Phone not provided"}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass[coworker.status] || statusClass.disabled}`}
                  >
                    {coworker.status}
                  </span>
                </div>
              </article>
            ))}
            {!branchData.coworkers.length && (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No staff accounts are assigned to this branch yet.
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <Building2 className="mx-auto text-gray-400" size={24} />
          <h3 className="mt-3 font-semibold">No branch assigned</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ask an administrator to assign your account to a branch.
          </p>
        </div>
      )}
    </section>
  );
}
