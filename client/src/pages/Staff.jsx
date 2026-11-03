import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { KeyRound, Trash2, UserPlus, Users } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useToast } from "../hooks/UseToast.jsx";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition } from "../components/loadingVariants.js";

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#0A3B3D] outline-none transition placeholder:text-gray-400 focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";

export default function StaffPage() {
  const toast = useToast();
  const [branch, setBranch] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/staff/branch"),
      apiRequest("/api/staff/workers"),
      apiRequest("/api/users/staff"),
    ])
      .then(([branchData, workerData, accountData]) => {
        setBranch(branchData.branch);
        setWorkers(workerData);
        setStaffAccounts(accountData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const addWorker = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const worker = await apiRequest("/api/staff/workers", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, address }),
      });
      setWorkers((current) =>
        [...current, worker].sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      );
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      toast.success("Worker added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const createStaffAccount = async (event) => {
    event.preventDefault();
    setIsCreatingAccount(true);
    setError("");
    try {
      const account = await apiRequest("/api/users/staff", {
        method: "POST",
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          phone: staffPhone,
          password: staffPassword,
        }),
      });
      setStaffAccounts((current) =>
        [...current, account].sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      );
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      toast.success("Staff sign-in account created.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const removeWorker = async (worker) => {
    if (!window.confirm(`Remove ${worker.name} from your workers?`)) return;
    setError("");
    try {
      await apiRequest(`/api/staff/workers/${worker._id}`, {
        method: "DELETE",
      });
      setWorkers((current) => current.filter((item) => item._id !== worker._id));
      toast.success("Worker removed.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <section className="mx-auto max-w-6xl space-y-7 text-[#0A3B3D] dark:text-white">
      {isLoading && <p role="status" className="sr-only">Loading staff...</p>}
      <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition}>
        <p className="text-sm font-medium text-[#0A8B8E]">
          {branch?.name || "Branch team"}
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Staff</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Manage staff sign-in accounts and separate worker contact records for
          your branch.
        </p>
      </motion.header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {isLoading ? <div className="space-y-4"><div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><Skeleton className="h-6 w-40" /><Skeleton className="mt-2 h-4 w-72 max-w-full" /><div className="mt-5 grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div><Skeleton className="mt-4 h-10 w-32" /></div><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><div className="border-b border-gray-100 p-5 dark:border-neutral-800"><Skeleton className="h-5 w-24" /><Skeleton className="mt-2 h-4 w-56" /></div><div className="space-y-4 p-5">{[0, 1, 2, 3, 4].map((index) => <div key={index} className="grid grid-cols-4 gap-4"><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div>)}</div></div></div> : <FadeIn from="bottom" delay={0.3}><div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Create a staff sign-in account</h3>
            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              This account can take orders and confirm payments for your branch.
              Its role and branch are assigned automatically.
            </p>
          </div>
        </div>
        <form onSubmit={createStaffAccount} className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Staff name
            <input
              className={inputClassName}
              value={staffName}
              onChange={(event) => setStaffName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Login email
            <input
              className={inputClassName}
              type="email"
              value={staffEmail}
              onChange={(event) => setStaffEmail(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Contact number
            <input
              className={inputClassName}
              type="tel"
              value={staffPhone}
              onChange={(event) => setStaffPhone(event.target.value)}
              autoComplete="tel"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Initial password
            <input
              className={inputClassName}
              type="password"
              value={staffPassword}
              onChange={(event) => setStaffPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={isCreatingAccount} className={buttonClassName}>
              <UserPlus size={16} />
              {isCreatingAccount ? "Creating account..." : "Create staff account"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-gray-100 p-5 dark:border-neutral-800 sm:p-6">
          <h3 className="font-semibold">Staff sign-in accounts</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {staffAccounts.length} account{staffAccounts.length === 1 ? "" : "s"} for {branch?.name || "your branch"}.
          </p>
        </div>
        {staffAccounts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Login email</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {staffAccounts.map((account) => (
                  <tr key={account._id}>
                    <td className="px-5 py-4 font-medium">{account.name}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{account.email}</td>
                    <td className="px-5 py-4 capitalize">{account.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            No staff sign-in accounts yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Add a worker</h3>
            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Worker records are for contact details and do not provide sign-in access.
            </p>
          </div>
        </div>
        <form onSubmit={addWorker} className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Name
            <input
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Gmail / email
            <input
              className={inputClassName}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Contact number
            <input
              className={inputClassName}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Address
            <input
              className={inputClassName}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              autoComplete="street-address"
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={isSaving} className={buttonClassName}>
              {isSaving ? "Adding..." : "Add worker"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-gray-100 p-5 dark:border-neutral-800 sm:p-6">
          <h3 className="font-semibold">Workers</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {workers.length} worker{workers.length === 1 ? "" : "s"} registered
            {branch?.name ? ` at ${branch.name}` : ""}.
          </p>
        </div>
        {workers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Email</th>
                  <th className="px-5 py-3.5 font-semibold">Contact number</th>
                  <th className="px-5 py-3.5 font-semibold">Address</th>
                  <th className="px-5 py-3.5 text-right font-semibold"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {workers.map((worker) => (
                  <tr key={worker._id}>
                    <td className="px-5 py-4 font-medium">{worker.name}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {worker.email}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {worker.phone}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {worker.address}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeWorker(worker)}
                        aria-label={`Remove ${worker.name}`}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            No workers added yet.
          </p>
        )}
      </section>
      </div></FadeIn>}
      <AnimatePresence>{isLoading && <StreakBar />}</AnimatePresence>
    </section>
    </MotionConfig>
  );
}
