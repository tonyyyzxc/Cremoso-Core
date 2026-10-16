import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await apiRequest("/api/users"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const changeRole = async (userId, role) => {
    try {
      await apiRequest(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-6 text-[#0A3B3D] dark:text-white">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Administrator controls</p>
        <h2 className="mt-1 text-2xl font-semibold">User access</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Assign ADMIN or STAFF access to accounts. Role changes take effect on the next API request.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading ? <p className="p-6 text-sm text-gray-500">Loading users…</p> : !users.length ? <p className="p-6 text-sm text-gray-500">No accounts found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Role</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {users.map((user) => <tr key={user._id}>
                  <td className="px-5 py-4 font-medium">{user.name || "—"}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                  <td className="px-5 py-4 capitalize text-gray-600 dark:text-gray-300">{user.status}</td>
                  <td className="px-5 py-4"><select value={user.role} onChange={(event) => changeRole(user._id, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"><option value="staff">STAFF</option><option value="admin">ADMIN</option></select></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">First-time Google sign-ins start as STAFF. Keep at least one active administrator account.</p>
    </section>
  );
}
