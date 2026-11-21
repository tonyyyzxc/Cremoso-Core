import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  Building2,
  Check,
  CircleUserRound,
  Eye,
  EyeOff,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useToast } from "../hooks/UseToast.jsx";
import { useEditLock } from "../hooks/useEditLock.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import {
  fadeTransition,
  riseIn,
  staggerContainer,
} from "../components/loadingVariants.js";

const inputClassName =
  "w-full rounded-xl border border-[#E9E2D6] bg-[#FFFCF7] px-3.5 py-2.5 text-sm text-[#0A3B3D] outline-none transition placeholder:text-gray-400 focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";
const cardClassName =
  "rounded-2xl border border-[#E9E2D6] bg-[#FFFCF7] shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

function statusClass(status) {
  if (status === "active")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "invited")
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300";
}

export default function ManagementPage() {
  const toast = useToast();
  const accountLock = useEditLock();
  const branchLock = useEditLock();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState("");
  const [newStaffBranchId, setNewStaffBranchId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [accountType, setAccountType] = useState("branch");
  const [newAccountName, setNewAccountName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountMenu, setAccountMenu] = useState(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerBranchFilter, setWorkerBranchFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  const loadData = useCallback(async () => {
    const [loadedUsers, loadedBranches, loadedWorkers] = await Promise.all([
      apiRequest("/api/users"),
      apiRequest("/api/branches"),
      apiRequest("/api/branches/workers"),
    ]);
    setUsers(loadedUsers);
    setBranches(loadedBranches);
    setWorkers(loadedWorkers);
  }, []);

  useEffect(() => {
    Promise.resolve()
      .then(() => loadData())
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadData]);

  const staffAccounts = useMemo(
    () => users.filter((account) => account.role === "staff"),
    [users],
  );

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((account) => {
      if (account._id === currentUser?.id && !isSuperAdmin) return false;
      const matchesStatus =
        statusFilter === "all" || account.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [account.name, account.branchId?.name, account.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [users, currentUser?.id, isSuperAdmin, search, statusFilter]);

  const filteredWorkers = useMemo(() => {
    const normalizedSearch = workerSearch.trim().toLowerCase();
    return workers.filter((worker) => {
      const matchesBranch =
        workerBranchFilter === "all" ||
        worker.branchId?._id === workerBranchFilter;
      const matchesSearch =
        !normalizedSearch ||
        [worker.name, worker.phone, worker.email, worker.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesBranch && matchesSearch;
    });
  }, [workers, workerSearch, workerBranchFilter]);

  const pendingCount = staffAccounts.filter(
    (account) => account.status === "invited",
  ).length;
  const activeCount = staffAccounts.filter(
    (account) => account.status === "active",
  ).length;

  const addAccount = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const isBranch = accountType === "branch";
      const isStaff = accountType === "staff";
      const result = await apiRequest(
        isBranch ? "/api/branches/account" : "/api/users",
        {
          method: "POST",
          body: JSON.stringify(
            isBranch
              ? {
                  name: newBranchName,
                  address: newBranchAddress,
                  phone: newBranchPhone,
                  email,
                  password: newPassword,
                }
              : {
                  name: newAccountName,
                  email,
                  role: isStaff ? "staff" : "admin",
                  ...(isStaff ? { branchId: newStaffBranchId } : {}),
                  password: newPassword,
                },
          ),
        },
      );
      if (isBranch) {
        setBranches((current) =>
          [...current, result.branch].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }
      const user = isBranch ? result.user : result;
      setUsers((current) => [user, ...current]);
      setNewAccountName("");
      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchPhone("");
      setNewStaffBranchId("");
      setEmail("");
      setNewPassword("");
      setShowNewPassword(false);
      setAccountType("branch");
      setShowAddAccount(false);
      toast.success(
        isBranch ? "Branch account added." : isStaff ? "Staff account added." : "Admin account added.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeAddAccountModal = () => {
    if (busy) return;
    setShowAddAccount(false);
    setError("");
    setAccountType("branch");
    setNewAccountName("");
    setNewBranchName("");
    setNewBranchAddress("");
    setNewBranchPhone("");
    setNewStaffBranchId("");
    setEmail("");
    setNewPassword("");
    setShowNewPassword(false);
  };

  const openAccountEditor = async (account) => {
    setError("");
    try {
      const acquired = await accountLock.acquire("User", account._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      if (account.branchId?._id) {
        const branchAcquired = await branchLock.acquire("Branch", account.branchId._id);
        if (!branchAcquired) {
          await accountLock.release();
          setError("This record is currently unavailable for editing.");
          return;
        }
      }
    } catch (err) {
      try {
        await accountLock.release();
      } catch (releaseError) {
        setError(releaseError.message);
      }
      setError(err.message);
      return;
    }
    const branch = branches.find((item) => item._id === account.branchId?._id);
    setEditingAccount(account);
    setEditName(account.name || "");
    setEditPhone(account.phone || "");
    setEditBranchName(branch?.name || "");
    setEditBranchAddress(branch?.address || "");
    setEditBranchPhone(branch?.phone || "");
    setAccountMenu(null);
  };

  const closeAccountEditor = async () => {
    if (busy) return;
    setEditingAccount(null);
    for (const lock of [branchLock, accountLock]) {
      try {
        await lock.release();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const saveAccountDetails = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const acquired = await accountLock.acquire("User", editingAccount._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      if (editingAccount.branchId?._id) {
        const branchAcquired = await branchLock.acquire("Branch", editingAccount.branchId._id);
        if (!branchAcquired) {
          setError("This record is currently unavailable for editing.");
          return;
        }
        await Promise.all([
          apiRequest(`/api/users/${editingAccount._id}/contact`, {
            method: "PATCH",
            body: JSON.stringify({ name: editName, phone: editPhone }),
          }),
          apiRequest(`/api/branches/${editingAccount.branchId._id}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: editBranchName,
              address: editBranchAddress,
              phone: editBranchPhone,
              contactEmail: editingAccount.email,
            }),
          }),
        ]);
      } else {
        await apiRequest(`/api/users/${editingAccount._id}/contact`, {
          method: "PATCH",
          body: JSON.stringify({ name: editName, phone: editPhone }),
        });
      }
      setEditingAccount(null);
      for (const lock of [branchLock, accountLock]) await lock.release();
      await loadData();
      toast.success("Account details saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (account) => {
    const nextStatus = account.status === "active" ? "disabled" : "active";
    if (
      nextStatus === "disabled" &&
      !window.confirm(
        `Disable ${account.email}? They will no longer be able to sign in.`,
      )
    )
      return;
    setBusyUserId(account._id);
    setError("");
    try {
      const acquired = await accountLock.acquire("User", account._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      const updated = await apiRequest(`/api/users/${account._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setUsers((current) =>
        current.map((item) =>
          item._id === account._id ? { ...item, status: updated.status } : item,
        ),
      );
      toast.success(
        nextStatus === "active"
          ? "Account approved and activated."
          : "Account disabled.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId("");
      try {
        await accountLock.release();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const changeRole = async (account, nextRole) => {
    setAccountMenu(null);
    setBusyUserId(account._id);
    setError("");
    try {
      const acquired = await accountLock.acquire("User", account._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      const updated = await apiRequest(`/api/users/${account._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      setUsers((current) =>
        current.map((item) =>
          item._id === account._id ? { ...item, role: updated.role } : item,
        ),
      );
      toast.success(`Account role changed to ${nextRole}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId("");
      try {
        await accountLock.release();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const deleteAccount = async (account) => {
    const branchId = account.branchId?._id;
    const confirmation = branchId
      ? `Permanently delete ${account.branchId.name}, its accounts, and its workers? This cannot be undone.`
      : `Permanently delete ${account.email}? This cannot be undone.`;
    if (!window.confirm(confirmation)) return;
    setBusyUserId(account._id);
    setError("");
    try {
      const acquired = await accountLock.acquire("User", account._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
      if (branchId) {
        const branchAcquired = await branchLock.acquire("Branch", branchId);
        if (!branchAcquired) {
          await accountLock.release();
          setError("This record is currently unavailable for editing.");
          return;
        }
      }
      const result = await apiRequest(`/api/users/${account._id}`, {
        method: "DELETE",
      });
      if (result.branchId) {
        setUsers((current) =>
          current.filter((item) => item.branchId?._id !== result.branchId),
        );
        setBranches((current) =>
          current.filter((branch) => branch._id !== result.branchId),
        );
        setWorkers((current) =>
          current.filter((worker) => worker.branchId?._id !== result.branchId),
        );
      } else {
        setUsers((current) =>
          current.filter((item) => item._id !== account._id),
        );
      }
      toast.success(
        result.branchId
          ? "Branch and related data deleted."
          : "Account deleted.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId("");
      for (const lock of [branchLock, accountLock]) {
        try {
          await lock.release();
        } catch (err) {
          setError(err.message);
        }
      }
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto max-w-7xl space-y-7 text-[#0A3B3D] dark:text-white">
        {loading && (
          <p role="status" className="sr-only">
            Loading management...
          </p>
        )}
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fadeTransition}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A7779]">
              People & access
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
              Management
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Manage branch accounts and see the workers each branch has
              registered.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setShowAddAccount(true);
              }}
              className={buttonClassName}
            >
              <UserPlus size={17} /> Add account
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#0A8B8E]/15 bg-[#0A8B8E]/5 px-3.5 py-2.5 text-sm font-medium text-[#0A6B6E] dark:text-teal-300">
              <ShieldCheck size={17} />
              {isSuperAdmin ? "Super Admin workspace" : "Admin workspace"}
            </div>
          </div>
        </motion.header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {loading && (
          <div className="space-y-6">
            <div className={`${cardClassName} overflow-hidden p-5`}>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-80 max-w-full" />
              <div className="mt-5 space-y-4">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={`${cardClassName} flex gap-4 p-5`}>
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                </div>
              ))}
            </div>
            <div className={`${cardClassName} space-y-4 p-5`}>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-11 w-full" />
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
            <div className={`${cardClassName} space-y-4 p-5`}>
              <Skeleton className="h-6 w-32" />
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          </div>
        )}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "hidden" : ""}`}
        >
          {[
            {
              label: "Branches",
              value: branches.length,
              icon: Building2,
              tint: "bg-[#F2C879]/30 text-[#8A641B] dark:text-amber-200",
            },
            {
              label: "Awaiting approval",
              value: pendingCount,
              icon: CircleUserRound,
              tint: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
            },
            {
              label: "Active branch accounts",
              value: activeCount,
              icon: Check,
              tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
            },
            {
              label: "Workers",
              value: workers.length,
              icon: Users,
              tint: "bg-[#0A8B8E]/10 text-[#0A8B8E]",
            },
          ].map(({ label, value, icon: Icon, tint }) => (
            <motion.article
              variants={riseIn}
              key={label}
              className={`${cardClassName} flex items-center gap-4 p-5`}
            >
              <div className={`rounded-xl p-3 ${tint}`}>
                <Icon size={19} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                  {value}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <section
          className={`${cardClassName} overflow-hidden ${loading ? "hidden" : ""}`}
        >
          <div className="border-b border-[#EFE7DB] p-5 dark:border-neutral-800 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-semibold">Branches</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Right-click an account to edit its details, change its role,
                  or delete it.
                </p>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAccounts.length} of{" "}
                {
                  users.filter((account) => isSuperAdmin || account._id !== currentUser?.id)
                    .length
                }{" "}
                accounts
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  className={`${inputClassName} pl-9`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, branch, or email"
                  aria-label="Search accounts"
                />
              </label>
              <select
                className={inputClassName}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="invited">Awaiting approval</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-sm">
              <thead className="bg-[#F5EFE4] text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Account</th>
                  <th className="px-5 py-3.5 font-semibold">Contact</th>
                  <th className="px-5 py-3.5 font-semibold">Address</th>
                  <th className="px-5 py-3.5 font-semibold">Role</th>
                  <th className="px-5 py-3.5 font-semibold">Workers</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {filteredAccounts.map((account) => {
                  const branch = branches.find(
                    (item) => item._id === account.branchId?._id,
                  );
                  const workerCount = workers.filter(
                    (worker) => worker.branchId?._id === account.branchId?._id,
                  ).length;
                  return (
                    <tr
                      key={account._id}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (account.isSuperAdmin || (!isSuperAdmin && account.role === "admin")) return;
                        setAccountMenu({
                          account,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      className="hover:bg-[#F5EFE4]/70 dark:hover:bg-neutral-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {account.name ||
                            (account.branchId?._id
                              ? "Branch manager"
                              : account.email)}
                        </div>
                        {account.name && (
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {account.email}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        <div>
                          {account.phone ||
                            (account.branchId?._id
                              ? "No manager phone"
                              : "None")}
                        </div>
                        {branch?.phone && (
                          <div className="mt-0.5 text-gray-500 dark:text-gray-400">
                            Branch: {branch.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {branch?.address || "No address"}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {account.isSuperAdmin ? "Super Admin" : account.role}
                      </td>
                      <td className="px-5 py-4">{workerCount}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(account.status)}`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => changeStatus(account)}
                            disabled={
                              busyUserId === account._id ||
                              account.isSuperAdmin ||
                              (account.role === "admin" && !isSuperAdmin) ||
                              (account.status !== "active" && !account.branchId) ||
                              accountLock.isBlocked("User", account._id)
                            }
                            className="rounded-lg border border-[#E9E2D6] px-3 py-1.5 text-xs font-semibold text-[#0A3B3D] transition hover:bg-[#FBF6EF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
                          >
                            {account.status === "active"
                              ? "Disable"
                              : account.status === "invited"
                                ? "Approve"
                                : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredAccounts.length && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No accounts match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showAddAccount && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAddAccountModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-account-title"
              className={`${cardClassName} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
                    <UserPlus size={19} />
                  </div>
                  <div>
                    <h3 id="add-account-title" className="font-semibold">
                      Add an account
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Create an administrator account or a branch account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddAccountModal}
                  disabled={busy}
                  aria-label="Close add account dialog"
                  className="rounded-lg p-2 text-gray-500 hover:bg-[#F5EFE4] disabled:opacity-50 dark:hover:bg-neutral-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={addAccount}
                className="mt-5 grid gap-4 md:grid-cols-2"
              >
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                  Account type
                  <select
                    className={inputClassName}
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value)}
                  >
                    <option value="branch">Branch account</option>
                    <option value="staff">Staff account</option>
                    {isSuperAdmin && <option value="admin">Admin account</option>}
                  </select>
                </label>
                {accountType === "branch" ? (
                  <>
                    <label className="space-y-1.5 text-sm font-medium">
                      Branch name <span className="text-red-600">*</span>
                      <input
                        className={inputClassName}
                        value={newBranchName}
                        onChange={(event) =>
                          setNewBranchName(event.target.value)
                        }
                        placeholder="e.g. Malaybalay"
                        required
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Branch phone
                      <input
                        className={inputClassName}
                        type="tel"
                        autoComplete="tel"
                        value={newBranchPhone}
                        onChange={(event) =>
                          setNewBranchPhone(event.target.value)
                        }
                        placeholder="Optional"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                      Address
                      <input
                        className={inputClassName}
                        value={newBranchAddress}
                        onChange={(event) =>
                          setNewBranchAddress(event.target.value)
                        }
                        placeholder="Street, city, or area"
                      />
                    </label>
                  </>
                ) : accountType === "staff" ? (
                  <>
                    <label className="space-y-1.5 text-sm font-medium">
                      Staff name <span className="text-red-600">*</span>
                      <input
                        className={inputClassName}
                        value={newAccountName}
                        onChange={(event) => setNewAccountName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Branch <span className="text-red-600">*</span>
                      <select
                        className={inputClassName}
                        value={newStaffBranchId}
                        onChange={(event) => setNewStaffBranchId(event.target.value)}
                        required
                      >
                        <option value="">Select a branch</option>
                        {branches.map((branch) => (
                          <option key={branch._id} value={branch._id}>{branch.name}</option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                    Admin name <span className="text-red-600">*</span>
                    <input
                      className={inputClassName}
                      value={newAccountName}
                      onChange={(event) =>
                        setNewAccountName(event.target.value)
                      }
                      required
                    />
                  </label>
                )}
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                  Login email <span className="text-red-600">*</span>
                  <input
                    className={inputClassName}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                  Initial password <span className="text-red-600">*</span>
                  <span className="relative block">
                    <input
                      className={`${inputClassName} pr-12`}
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </span>
                </label>
                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red-700 dark:text-red-300 md:col-span-2"
                  >
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1 md:col-span-2">
                  <button
                    type="button"
                    onClick={closeAddAccountModal}
                    disabled={busy}
                    className="rounded-xl border border-[#E9E2D6] px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className={buttonClassName}
                  >
                    <UserPlus size={16} />
                    {busy
                      ? "Adding..."
                      : accountType === "branch"
                        ? "Add branch account"
                        : accountType === "staff"
                          ? "Add staff account"
                          : "Add admin account"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {accountMenu && (
          <>
            <button
              type="button"
              aria-label="Close account menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setAccountMenu(null)}
              onContextMenu={(event) => {
                event.preventDefault();
                setAccountMenu(null);
              }}
            />
            <div
              role="menu"
              className="fixed z-50 min-w-44 rounded-xl border border-[#E9E2D6] bg-[#FFFCF7] p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
              style={{
                left: Math.min(accountMenu.x, window.innerWidth - 190),
                top: Math.min(accountMenu.y, window.innerHeight - 230),
              }}
            >
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Change role
              </p>
              {(isSuperAdmin ? ["admin", "branch", "staff"] : ["branch", "staff"]).map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  disabled={
                    busyUserId === accountMenu.account._id ||
                    accountMenu.account.role === role ||
                    (role !== "admin" && !accountMenu.account.branchId) ||
                    accountLock.isBlocked("User", accountMenu.account._id)
                  }
                  onClick={() => changeRole(accountMenu.account, role)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm capitalize hover:bg-[#F5EFE4] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800"
                  title={
                    role !== "admin" && !accountMenu.account.branchId
                      ? "Assign a branch before selecting this role."
                      : undefined
                  }
                >
                  {role === accountMenu.account.role ? `${role} (current)` : role}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                disabled={
                  busyUserId === accountMenu.account._id ||
                  accountMenu.account.isSuperAdmin ||
                  (accountMenu.account.role === "admin" && !isSuperAdmin) ||
                  accountLock.isBlocked("User", accountMenu.account._id) ||
                  Boolean(accountMenu.account.branchId?._id && branchLock.isBlocked("Branch", accountMenu.account.branchId._id))
                }
                onClick={() => openAccountEditor(accountMenu.account)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F5EFE4] disabled:opacity-50 dark:hover:bg-neutral-800"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={
                  busyUserId === accountMenu.account._id ||
                  accountLock.isBlocked("User", accountMenu.account._id) ||
                  Boolean(accountMenu.account.branchId?._id && branchLock.isBlocked("Branch", accountMenu.account.branchId._id))
                }
                onClick={() => {
                  const account = accountMenu.account;
                  setAccountMenu(null);
                  deleteAccount(account);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </>
        )}

        {editingAccount && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAccountEditor();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-account-title"
              className="w-full max-w-xl rounded-2xl bg-[#FFFCF7] p-6 shadow-xl dark:bg-neutral-900"
            >
              <h3 id="edit-account-title" className="text-lg font-semibold">
                Edit account details
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Login email: {editingAccount.email}
              </p>
              <form onSubmit={saveAccountDetails} className="mt-5 space-y-4">
                {editingAccount.branchId?._id ? (
                  <>
                    <p className="border-b border-[#EFE7DB] pb-2 text-xs font-semibold uppercase tracking-wide text-[#0A8B8E] dark:border-neutral-800">
                      Branch manager
                    </p>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Manager name
                      <input
                        className={inputClassName}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Manager phone
                      <input
                        className={inputClassName}
                        type="tel"
                        value={editPhone}
                        onChange={(event) => setEditPhone(event.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                    <p className="border-b border-[#EFE7DB] pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-[#0A8B8E] dark:border-neutral-800">
                      Branch information
                    </p>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Branch name
                      <input
                        className={inputClassName}
                        value={editBranchName}
                        onChange={(event) =>
                          setEditBranchName(event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Address
                      <input
                        className={inputClassName}
                        value={editBranchAddress}
                        onChange={(event) =>
                          setEditBranchAddress(event.target.value)
                        }
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-1.5 text-sm font-medium">
                        Branch phone
                        <input
                          className={inputClassName}
                          type="tel"
                          value={editBranchPhone}
                          onChange={(event) =>
                            setEditBranchPhone(event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Name
                      <input
                        className={inputClassName}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium">
                      Phone
                      <input
                        className={inputClassName}
                        type="tel"
                        value={editPhone}
                        onChange={(event) => setEditPhone(event.target.value)}
                      />
                    </label>
                  </>
                )}
                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red-700 dark:text-red-300"
                  >
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeAccountEditor}
                    className="rounded-xl border border-[#E9E2D6] px-4 py-2.5 text-sm font-semibold dark:border-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      busy ||
                      accountLock.isBlocked("User", editingAccount._id) ||
                      Boolean(editingAccount.branchId?._id && branchLock.isBlocked("Branch", editingAccount.branchId._id))
                    }
                    className={buttonClassName}
                  >
                    {busy ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <FadeIn from="bottom" delay={0.3}>
          <section
            className={`${cardClassName} overflow-hidden ${loading ? "hidden" : ""}`}
          >
            <div className="border-b border-[#EFE7DB] p-5 dark:border-neutral-800 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Workers</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    People registered by each branch account.
                  </p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredWorkers.length} of {workers.length} workers
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    className={`${inputClassName} pl-9`}
                    value={workerSearch}
                    onChange={(event) => setWorkerSearch(event.target.value)}
                    placeholder="Search name, contact, email, or address"
                    aria-label="Search workers"
                  />
                </label>
                <select
                  className={inputClassName}
                  value={workerBranchFilter}
                  onChange={(event) =>
                    setWorkerBranchFilter(event.target.value)
                  }
                  aria-label="Filter workers by branch"
                >
                  <option value="all">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-250 text-left text-sm">
                <thead className="bg-[#F5EFE4] text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Name</th>
                    <th className="px-5 py-3.5 font-semibold">Email</th>
                    <th className="px-5 py-3.5 font-semibold">Phone</th>
                    <th className="px-5 py-3.5 font-semibold">Address</th>
                    <th className="px-5 py-3.5 font-semibold">Branch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {filteredWorkers.map((worker) => (
                    <tr
                      key={worker._id}
                      className="hover:bg-[#F5EFE4]/70 dark:hover:bg-neutral-800/40"
                    >
                      <td className="px-5 py-4 font-medium">{worker.name}</td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {worker.email || "No email"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {worker.phone || "No phone"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {worker.address || "No address"}
                      </td>
                      <td className="px-5 py-4">
                        {worker.branchId?.name || "Unassigned"}
                      </td>
                    </tr>
                  ))}
                  {!filteredWorkers.length && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        {workers.length
                          ? "No workers match these filters."
                          : "No workers have been added yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </FadeIn>
        <AnimatePresence>{loading && <StreakBar />}</AnimatePresence>
      </section>
    </MotionConfig>
  );
}
