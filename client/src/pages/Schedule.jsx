import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleAlert, Pencil, Plus, RefreshCw, RotateCw, Trash2 } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useEditLock } from "../hooks/useEditLock.js";
import { useToast } from "../hooks/UseToast.jsx";
import { Skeleton } from "../components/loading.jsx";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "scheme-light dark:scheme-dark w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toManilaInput(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function toIsoDateTime(value) {
  return new Date(`${value}:00+08:00`).toISOString();
}

function getId(value) {
  if (typeof value === "string") return value;
  return value?._id?.toString() || "";
}

function formatShiftTime(value) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCalendarCreatorName(shift) {
  return shift.calendarCreatorId?.name || "the event creator";
}

function getShiftForm(shift) {
  return {
    branchId: getId(shift.branchId),
    startsAt: toManilaInput(shift.startsAt),
    endsAt: toManilaInput(shift.endsAt),
    assignedStaffIds: (shift.assignedStaffIds || []).map(getId),
    notes: shift.notes || "",
  };
}

function emptyForm(branchId = "") {
  return {
    branchId,
    startsAt: "",
    endsAt: "",
    assignedStaffIds: [],
    notes: "",
  };
}

export default function SchedulePage() {
  const toast = useToast();
  const formLock = useEditLock();
  const actionLock = useEditLock();
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = user?.role === "admin";
  const canManage = ["admin", "branch"].includes(user?.role);
  const [branches, setBranches] = useState([]);
  const [managerBranchId, setManagerBranchId] = useState("");
  const [viewBranchId, setViewBranchId] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffBranchId, setStaffBranchId] = useState("");
  const [shifts, setShifts] = useState([]);
  const [from, setFrom] = useState(getManilaDateKey);
  const [to, setTo] = useState(() => addDays(getManilaDateKey(), 30));
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState("");
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeBranchId = isAdmin ? form.branchId : managerBranchId;
  const availableStaff = staffBranchId === activeBranchId ? staff : [];
  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (isAdmin && viewBranchId) params.set("branchId", viewBranchId);
      setShifts(await apiRequest(`/api/calendar/shifts?${params.toString()}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, isAdmin, viewBranchId]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      setCalendarStatus(await apiRequest("/api/calendar/status"));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const callbackStatus = new URLSearchParams(window.location.search).get("calendar");
    if (callbackStatus) {
      if (callbackStatus === "connected") toast.success("Google Calendar connected.");
      if (callbackStatus === "connect_failed") toast.error("Unable to connect Google Calendar. Please try again.");
      if (callbackStatus === "connect_cancelled") toast.error("Google Calendar connection was cancelled.");
      if (callbackStatus === "disabled") toast.error("Google Calendar is disabled by an administrator.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    const loadPageData = async () => {
      const requests = [apiRequest("/api/calendar/status")];
      if (isAdmin) requests.push(apiRequest("/api/branches"));
      if (user?.role === "branch") requests.push(apiRequest("/api/staff/branch"));
      try {
        const results = await Promise.all(requests);
        if (!active) return;
        setCalendarStatus(results[0]);
        if (isAdmin) setBranches(results[1]);
        if (user?.role === "branch") {
          const branchId = getId(results[1]?.branch);
          setManagerBranchId(branchId);
          setForm((current) => ({ ...current, branchId }));
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    loadPageData();
    return () => {
      active = false;
    };
  }, [isAdmin, user?.role, toast]);

  useEffect(() => {
    Promise.resolve().then(loadShifts);
  }, [loadShifts]);

  useEffect(() => {
    if (!canManage || !activeBranchId) return undefined;
    let active = true;
    apiRequest(`/api/calendar/staff?branchId=${encodeURIComponent(activeBranchId)}`)
      .then((data) => {
        if (active) {
          setStaff(data);
          setStaffBranchId(activeBranchId);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [canManage, activeBranchId]);

  const connectGoogle = async () => {
    try {
      const { url } = await apiRequest("/api/calendar/connect");
      window.location.assign(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = async () => {
    try {
      await formLock.release();
    } catch (releaseError) {
      setError(releaseError.message);
    }
    setEditingId("");
    setForm(emptyForm(managerBranchId));
  };

  const submitShift = async (event) => {
    event.preventDefault();
    if (new Date(toIsoDateTime(form.startsAt)) >= new Date(toIsoDateTime(form.endsAt))) {
      setError("The shift end time must be after its start time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId && (
        formLock.activeResource?.resourceType !== "ShiftSchedule"
        || formLock.activeResource.resourceId !== editingId
      )) {
        const acquired = await formLock.acquire("ShiftSchedule", editingId);
        if (!acquired) {
          setError("This record is currently unavailable for editing.");
          return;
        }
      }
      const payload = {
        branchId: form.branchId,
        startsAt: toIsoDateTime(form.startsAt),
        endsAt: toIsoDateTime(form.endsAt),
        assignedStaffIds: form.assignedStaffIds,
        notes: form.notes,
      };
      const savedShift = await apiRequest(
        editingId ? `/api/calendar/shifts/${editingId}` : "/api/calendar/shifts",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      if (savedShift.calendarSyncStatus === "pending") {
        toast.info("Schedule updated in Cremoso-Core. The event creator must sync Google Calendar.");
      } else {
        toast.success(editingId ? "Shift updated and synced." : "Shift created and synced to Google Calendar.");
      }
      await resetForm();
      await loadShifts();
      await loadCalendarStatus();
    } catch (requestError) {
      await loadShifts();
      await loadCalendarStatus();
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const editShift = async (shift) => {
    setError("");
    try {
      const acquired = await formLock.acquire("ShiftSchedule", shift._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    setEditingId(shift._id);
    setForm(getShiftForm(shift));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelShift = async (shift) => {
    if (!window.confirm("Cancel this shift?")) return;
    setError("");
    try {
      const acquired = await actionLock.acquire("ShiftSchedule", shift._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    try {
      const cancelledShift = await apiRequest(`/api/calendar/shifts/${shift._id}/cancel`, { method: "POST" });
      if (cancelledShift.calendarSyncStatus === "pending") {
        toast.info("Shift cancelled in Cremoso-Core. The event creator must sync Google Calendar.");
      } else {
        toast.success("Shift cancelled and removed from Google Calendar.");
      }
      await loadShifts();
    } catch (requestError) {
      await loadShifts();
      setError(requestError.message);
    } finally {
      try {
        await actionLock.release();
      } catch (releaseError) {
        setError(releaseError.message);
      }
    }
  };

  const syncShift = async (shift) => {
    setError("");
    try {
      const acquired = await actionLock.acquire("ShiftSchedule", shift._id);
      if (!acquired) {
        setError("This record is currently unavailable for editing.");
        return;
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    try {
      await apiRequest(`/api/calendar/shifts/${shift._id}/sync`, { method: "POST" });
      toast.success("Shift changes synced to Google Calendar.");
      await loadShifts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      try {
        await actionLock.release();
      } catch (releaseError) {
        setError(releaseError.message);
      }
    }
  };

  const setStaffSelection = (event) => {
    updateForm(
      "assignedStaffIds",
      Array.from(event.target.selectedOptions, (option) => option.value),
    );
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-[#0A3B3D] dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">Branch operations</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Shift Schedule</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Manage branch shifts and keep their events in Google Calendar.
          </p>
        </div>
        <button type="button" onClick={loadShifts} disabled={loading} className={secondaryButtonClass}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <CircleAlert size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {calendarStatus?.enabled && !calendarStatus.calendarConnected && (
        <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4 p-5`}>
          <div>
            <h3 className="font-semibold">Connect Google Calendar</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {calendarStatus.connected
                ? "Reconnect your Google account to grant Calendar event access."
                : "Connect your Google account to sync shifts and invite assigned staff."}
            </p>
          </div>
          {canManage && (
            <button type="button" onClick={connectGoogle} className={primaryButtonClass}>
              <CalendarDays size={16} />
              {calendarStatus.connected ? "Reconnect Google" : "Connect Google"}
            </button>
          )}
        </section>
      )}

      {canManage && (
        <form onSubmit={submitShift} className={`${cardClass} space-y-4 p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{editingId ? "Edit shift" : "Schedule a shift"}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Times use Asia/Manila. Assigned staff will be invited to the event.
              </p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className={secondaryButtonClass}>
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isAdmin && (
              <label className="text-xs font-medium text-gray-500">
                Branch
                <select
                  required
                  className={`${inputClass} mt-1`}
                  value={form.branchId}
                  onChange={(event) => {
                    updateForm("branchId", event.target.value);
                    updateForm("assignedStaffIds", []);
                  }}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-gray-500">
              Starts at
              <input
                required
                className={`${inputClass} mt-1`}
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => updateForm("startsAt", event.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Ends at
              <input
                required
                className={`${inputClass} mt-1`}
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => updateForm("endsAt", event.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Assign staff
              <select
                required
                multiple
                className={`${inputClass} mt-1 min-h-28`}
                value={form.assignedStaffIds}
                onChange={setStaffSelection}
                disabled={!activeBranchId || availableStaff.length === 0}
              >
                {availableStaff.map((member) => (
                  <option key={member._id} value={member._id}>{member.name} ({member.email})</option>
                ))}
              </select>
              <span className="mt-1 block font-normal">
                Hold Ctrl (Windows) or Command (Mac) to select multiple.
              </span>
            </label>
            <label className="text-xs font-medium text-gray-500 sm:col-span-2 lg:col-span-4">
              Notes (optional)
              <textarea
                className={`${inputClass} mt-1 min-h-20`}
                maxLength={1000}
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
              />
            </label>
          </div>
          {!calendarStatus?.enabled && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Google Calendar sync is disabled. Shifts will be saved in Cremoso-Core without syncing to Google.</p>
          )}
          {calendarStatus?.enabled && !calendarStatus.calendarConnected && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Connect Calendar before creating shifts.
            </p>
          )}
          <button
            type="submit"
            disabled={saving || (calendarStatus?.enabled && !calendarStatus.calendarConnected) || !form.assignedStaffIds.length || Boolean(editingId && formLock.isBlocked("ShiftSchedule", editingId))}
            className={primaryButtonClass}
          >
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {saving ? "Saving..." : editingId ? "Save changes" : "Create shift"}
          </button>
        </form>
      )}

      <section className={`${cardClass} p-4`} aria-label="Schedule filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <label className="text-xs font-medium text-gray-500">
              Branch filter
              <select className={`${inputClass} mt-1`} value={viewBranchId} onChange={(event) => setViewBranchId(event.target.value)}>
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-xs font-medium text-gray-500">
            From date
            <input className={`${inputClass} mt-1`} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="text-xs font-medium text-gray-500">
            To date
            <input className={`${inputClass} mt-1`} type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="space-y-3" aria-label="Scheduled shifts">
        {loading && (
          <div role="status" aria-label="Loading shifts" className="space-y-3">
            {[0, 1, 2].map((item) => (
              <article key={item} className={`${cardClass} space-y-3 p-5`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </article>
            ))}
          </div>
        )}
        {!loading && shifts.length === 0 && (
          <div className={`${cardClass} p-8 text-center`}>
            <CalendarDays className="mx-auto text-[#0A8B8E]" size={28} />
            <p className="mt-3 font-medium">No shifts in this date range</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adjust the dates or schedule a new branch shift.
            </p>
          </div>
        )}
        {shifts.map((shift) => {
          const creatorId = getId(shift.calendarCreatorId);
          const isCreator = creatorId === user?.id;
          const isPending = calendarStatus?.enabled && shift.calendarSyncStatus === "pending";
          return (
            <article key={shift._id} className={`${cardClass} ${shift.status === "cancelled" ? "opacity-70" : ""} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{shift.branchId?.name || "Branch shift"}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${shift.status === "cancelled" ? "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                      {shift.status === "cancelled" ? "Cancelled" : "Scheduled"}
                    </span>
                    {isPending && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Calendar sync pending
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {formatShiftTime(shift.startsAt)} – {formatShiftTime(shift.endsAt)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Staff: {(shift.assignedStaffIds || []).map((member) => member.name || "Staff").join(", ")}
                  </p>
                  {shift.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500 dark:text-gray-400">{shift.notes}</p>}
                  {isPending && !isCreator && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      The app schedule is updated. {getCalendarCreatorName(shift)} must sync the Calendar event.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isPending && isCreator && canManage && (
                    <button type="button" onClick={() => syncShift(shift)} className={secondaryButtonClass}>
                      <RotateCw size={15} />
                      Sync Calendar
                    </button>
                  )}
                  {canManage && shift.status === "scheduled" && (
                    <>
                      <button type="button" onClick={() => editShift(shift)} disabled={formLock.isBlocked("ShiftSchedule", shift._id) || actionLock.isBlocked("ShiftSchedule", shift._id)} className={secondaryButtonClass}>
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button type="button" onClick={() => cancelShift(shift)} disabled={formLock.isBlocked("ShiftSchedule", shift._id) || actionLock.isBlocked("ShiftSchedule", shift._id)} className={secondaryButtonClass}>
                        <Trash2 size={15} />
                        Cancel shift
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
