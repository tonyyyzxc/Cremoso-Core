import { useCallback, useEffect, useState } from "react";
import { Ban, KeyRound, ShieldCheck, Trash2, UserCheck, UserPlus } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useToast } from "../hooks/UseToast.jsx";

const inputClassName = "w-full rounded-xl border border-gray-200 bg-[#FAF6F0] px-4 py-3 text-sm text-[#0A3B3D] outline-none transition placeholder:text-gray-400 focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClassName = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";

export default function SettingsPage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [staffGoogleAuthEnabled, setStaffGoogleAuthEnabled] = useState(true);
  const [isSavingGoogleSetting, setIsSavingGoogleSetting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [users, setUsers] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === "admin";

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setUsers(await apiRequest("/api/users"));
    } catch (err) {
      setError(err.message);
    }
  }, [isAdmin]);

  useEffect(() => {
    apiRequest("/api/auth-settings")
      .then((config) => setStaffGoogleAuthEnabled(config.staffGoogleAuthEnabled))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", closeMenu);
    return () => window.removeEventListener("keydown", closeMenu);
  }, []);

  const savePassword = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSavingPassword(true);
    setError("");
    try {
      await apiRequest("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setConfirmPassword("");
      toast.success("Password saved. You can now sign in with your email and password.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const toggleGoogleAuth = async () => {
    const nextValue = !staffGoogleAuthEnabled;
    setIsSavingGoogleSetting(true);
    setError("");
    try {
      const config = await apiRequest("/api/auth-settings", {
        method: "PATCH",
        body: JSON.stringify({ staffGoogleAuthEnabled: nextValue }),
      });
      setStaffGoogleAuthEnabled(config.staffGoogleAuthEnabled);
      toast.success(config.staffGoogleAuthEnabled ? "Staff Google sign-in enabled." : "Staff Google sign-in disabled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingGoogleSetting(false);
    }
  };

  const addStaffAccount = async (event) => {
    event.preventDefault();
    setIsAddingAccount(true);
    setError("");
    try {
      const addedUser = await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setUsers((currentUsers) => [addedUser, ...currentUsers]);
      setEmail("");
      setRole("staff");
      toast.success(`${role === "admin" ? "Admin" : "Staff"} account added.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const changeAccountStatus = async (account) => {
    const nextStatus = account.status === "disabled" ? "active" : "disabled";
    if (nextStatus === "disabled" && !window.confirm(`Disable ${account.email}? They will no longer be able to sign in.`)) {
      setContextMenu(null);
      return;
    }

    try {
      const updatedAccount = await apiRequest(`/api/users/${account._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setUsers((currentUsers) => currentUsers.map((user) =>
        user._id === account._id ? { ...user, status: updatedAccount.status } : user,
      ));
      toast.success(nextStatus === "disabled" ? "Account disabled." : "Account enabled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setContextMenu(null);
    }
  };

  const deleteAccount = async (account) => {
    if (!window.confirm(`Permanently delete ${account.email}? This cannot be undone.`)) {
      setContextMenu(null);
      return;
    }

    try {
      await apiRequest(`/api/users/${account._id}`, { method: "DELETE" });
      setUsers((currentUsers) => currentUsers.filter((user) => user._id !== account._id));
      toast.success("Account deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setContextMenu(null);
    }
  };

  const openAccountMenu = (event, account) => {
    event.preventDefault();
    setContextMenu({
      account,
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 120),
    });
  };

  return (
    <section className="mx-auto max-w-5xl space-y-7 text-[#0A3B3D] dark:text-white">
      <header>
        <p className="text-sm font-medium text-[#0A8B8E]">Account preferences</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Manage your sign-in details and account access for Cremoso.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]"><KeyRound size={20} /></div>
            <div>
              <h3 className="font-semibold">Set a password</h3>
              <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">Create a password to sign in manually with your email.</p>
            </div>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              Password
              <input className={inputClassName} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Confirm password
              <input className={inputClassName} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" required />
            </label>
            <button type="submit" disabled={isSavingPassword} className={buttonClassName}>
              {isSavingPassword ? "Saving..." : "Save password"}
            </button>
          </form>
        </section>

        {isAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-[#F2C879]/25 p-2.5 text-[#8A641B]"><ShieldCheck size={20} /></div>
              <div>
                <h3 className="font-semibold">Staff sign-in</h3>
                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">Choose how staff members can access their accounts.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950">
              <div>
                <p className="text-sm font-medium">Google sign-in</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{staffGoogleAuthEnabled ? "Staff can use their approved Google account." : "Staff must sign in with email and password."}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={staffGoogleAuthEnabled}
                aria-label="Enable Google sign-in for staff"
                onClick={toggleGoogleAuth}
                disabled={isSavingGoogleSetting}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${staffGoogleAuthEnabled ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${staffGoogleAuthEnabled ? "left-6" : "left-1"}`} />
              </button>
            </div>
          </section>
        )}
      </div>

      {isAdmin && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]"><UserPlus size={20} /></div>
              <div>
                <h3 className="font-semibold">System accounts</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add approved Gmail addresses for staff sign-in.</p>
              </div>
            </div>
            <form onSubmit={addStaffAccount} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
              <input className={inputClassName} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" required />
              <select className={inputClassName} value={role} onChange={(event) => setRole(event.target.value)} aria-label="Account role">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={isAddingAccount} className={`${buttonClassName} shrink-0`}>
                <UserPlus size={16} />{isAddingAccount ? "Adding..." : "Add account"}
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                <tr><th className="px-6 py-3">Gmail account</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Role</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {users.map((account) => (
                  <tr key={account._id} onContextMenu={(event) => openAccountMenu(event, account)} className="cursor-context-menu">
                    <td className="px-6 py-4 font-medium">{account.email}</td>
                    <td className="px-6 py-4 capitalize text-gray-600 dark:text-gray-300">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.status === "disabled" ? "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300" : "bg-[#0A8B8E]/10 text-[#0A8B8E]"}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{account.role.toUpperCase()}</td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan="3" className="px-6 py-6 text-center text-sm text-gray-500">No accounts have been added.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {contextMenu && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close account actions" onClick={() => setContextMenu(null)} />
          <div role="menu" className="fixed z-50 min-w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button type="button" role="menuitem" onClick={() => changeAccountStatus(contextMenu.account)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#0A3B3D] hover:bg-[#FBF6EF] dark:text-white dark:hover:bg-neutral-800">
              {contextMenu.account.status === "disabled"
                ? <UserCheck size={15} className="mr-2 inline" />
                : <Ban size={15} className="mr-2 inline" />}
              {contextMenu.account.status === "disabled" ? "Enable account" : "Disable account"}
            </button>
            <button type="button" role="menuitem" onClick={() => deleteAccount(contextMenu.account)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
              <Trash2 size={15} />Delete account
            </button>
          </div>
        </>
      )}
    </section>
  );
}
