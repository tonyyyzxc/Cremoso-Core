import { useEffect, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useToast } from "../hooks/UseToast.jsx";

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-[#FAF6F0] px-4 py-3 text-sm text-[#0A3B3D] outline-none transition placeholder:text-gray-400 focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";

export default function SettingsPage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [branch, setBranch] = useState(null);
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [staffGoogleAuthEnabled, setStaffGoogleAuthEnabled] = useState(true);
  const [staffAccountsWithoutPassword, setStaffAccountsWithoutPassword] = useState(0);
  const [isSavingGoogleSetting, setIsSavingGoogleSetting] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setUser(JSON.parse(sessionStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    apiRequest("/api/auth-settings")
      .then((config) => {
        setStaffGoogleAuthEnabled(config.staffGoogleAuthEnabled);
        setStaffAccountsWithoutPassword(config.staffAccountsWithoutPassword || 0);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    apiRequest("/api/auth/password-status")
      .then((data) => setHasPassword(data.hasPassword))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (user?.role !== "staff") return;
    apiRequest("/api/staff/branch")
      .then((data) => {
        setBranch(data.branch);
        setBranchAddress(data.branch?.address || "");
        setBranchPhone(data.branch?.phone || "");
        setBranchEmail(data.branch?.contactEmail || "");
      })
      .catch((err) => setError(err.message));
  }, [user?.role]);

  const savePassword = async (event) => {
    event.preventDefault();
    if (hasPassword && !currentPassword) {
      setError("Enter your current password to continue.");
      return;
    }
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
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      setHasPassword(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      toast.success(
        "Password saved. You can now sign in with your email and password.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const saveBranchInfo = async (event) => {
    event.preventDefault();
    setIsSavingBranch(true);
    setError("");
    try {
      const data = await apiRequest("/api/staff/branch", {
        method: "PATCH",
        body: JSON.stringify({
          address: branchAddress,
          phone: branchPhone,
          contactEmail: branchEmail,
        }),
      });
      setBranch(data.branch);
      toast.success("Branch details saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingBranch(false);
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
      setStaffAccountsWithoutPassword(config.staffAccountsWithoutPassword || 0);
      toast.success(
        config.staffGoogleAuthEnabled
          ? "Staff Google sign-in enabled."
          : "Staff Google sign-in disabled.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingGoogleSetting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-7 text-[#0A3B3D] dark:text-white">
      <header>
        <p className="text-sm font-medium text-[#0A8B8E]">
          Account preferences
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Manage your password and sign-in preferences for Cremoso.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-semibold">
                {hasPassword ? "Change password" : "Set a password"}
              </h3>
              <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                {hasPassword
                  ? "Enter your current password, then choose a new one."
                  : "Create a password to sign in manually with your email."}
              </p>
            </div>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              Current password {!hasPassword && <span className="font-normal text-gray-500">(optional if none is set)</span>}
              <span className="relative block">
                <input
                  className={`${inputClassName} pr-12`}
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder={hasPassword ? "" : "No current password set"}
                  required={hasPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Set a new password
              <span className="relative block">
                <input
                  className={`${inputClassName} pr-12`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                  className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Confirm password
              <span className="relative block">
                <input
                  className={`${inputClassName} pr-12`}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter the password again"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  className="absolute inset-y-0 right-3 text-gray-500 hover:text-[#0A8B8E] dark:text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <button
              type="submit"
              disabled={isSavingPassword}
              className={buttonClassName}
            >
              {isSavingPassword ? "Saving..." : "Save password"}
            </button>
          </form>
        </section>

        {user?.role === "staff" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-[#F2C879]/25 p-2.5 text-[#8A641B]">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Your branch</h3>
                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Branch details associated with your staff account.
                </p>
              </div>
            </div>
            {branch ? (
              <form
                onSubmit={saveBranchInfo}
                className="space-y-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950"
              >
                <h4 className="font-semibold">{branch.name}</h4>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} className="text-[#0A8B8E]" /> Address
                  </span>
                  <input
                    className={inputClassName}
                    value={branchAddress}
                    onChange={(event) => setBranchAddress(event.target.value)}
                    placeholder="Street, city, or area"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Phone size={16} className="text-[#0A8B8E]" /> Phone
                  </span>
                  <input
                    className={inputClassName}
                    type="tel"
                    autoComplete="tel"
                    value={branchPhone}
                    onChange={(event) => setBranchPhone(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Mail size={16} className="text-[#0A8B8E]" /> Contact email
                  </span>
                  <input
                    className={inputClassName}
                    type="email"
                    autoComplete="email"
                    value={branchEmail}
                    onChange={(event) => setBranchEmail(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSavingBranch}
                  className={buttonClassName}
                >
                  {isSavingBranch ? "Saving..." : "Save branch details"}
                </button>
              </form>
            ) : (
              <p className="rounded-xl bg-[#FBF6EF] p-4 text-sm text-gray-600 dark:bg-neutral-950 dark:text-gray-300">
                No branch is assigned to your account yet.
              </p>
            )}
          </section>
        )}

        {isAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-[#F2C879]/25 p-2.5 text-[#8A641B]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Staff sign-in</h3>
                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Choose how staff members can access their accounts.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#FBF6EF] p-4 dark:bg-neutral-950">
              <div>
                <p className="text-sm font-medium">Google sign-in</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {staffAccountsWithoutPassword > 0 && staffGoogleAuthEnabled
                    ? `Set passwords for all ${staffAccountsWithoutPassword} staff account${staffAccountsWithoutPassword === 1 ? "" : "s"} before turning off Google sign-in.`
                    : staffGoogleAuthEnabled
                    ? "Staff can use their approved Google account."
                    : "Staff must sign in with email and password."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={staffGoogleAuthEnabled}
                aria-label="Enable Google sign-in for staff"
                onClick={toggleGoogleAuth}
                disabled={
                  isSavingGoogleSetting ||
                  (staffGoogleAuthEnabled && staffAccountsWithoutPassword > 0)
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${staffGoogleAuthEnabled ? "bg-[#0A8B8E]" : "bg-gray-300 dark:bg-neutral-700"}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${staffGoogleAuthEnabled ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
