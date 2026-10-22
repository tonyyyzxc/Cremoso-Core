import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Trash2, Users } from "lucide-react";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/staff/branch"),
      apiRequest("/api/staff/workers"),
    ])
      .then(([branchData, workerData]) => {
        setBranch(branchData.branch);
        setWorkers(workerData);
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
          Add and manage the workers at your branch. These worker records do not
          create system accounts and cannot be used to sign in.
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
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Add a worker</h3>
            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              All fields are required. Worker email addresses are contact
              details only.
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
            <table className="w-full min-w-[760px] text-left text-sm">
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
