import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Archive, ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition } from "../components/loadingVariants.js";

const blankItem = (displayOrder = 0) => ({
  name: "",
  description: "",
  itemType: "product",
  category: "Soft-Serve",
  price: "",
  lowStockThreshold: "0",
  includedFruitPortions: "0",
  includedToppingPortions: "0",
  includedSaucePortions: "0",
  active: true,
  archived: false,
  displayOrder,
  supplyUsage: [],
  stockQuantity: "0",
  variants: [],
  addons: [],
});

const cardClass = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0A8B8E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";

function menuUrl(branchId, itemId = "") {
  const path = itemId ? `/api/menu/${itemId}` : "/api/menu";
  return `${path}?branchId=${encodeURIComponent(branchId)}`;
}

export default function MenuPage() {
  const [tab, setTab] = useState(() => (
    new URLSearchParams(window.location.search).get("tab") === "inventory" ? "inventory" : "items"
  ));
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [stockByMenuItemId, setStockByMenuItemId] = useState({});
  const [stockDraftByMenuItemId, setStockDraftByMenuItemId] = useState({});
  const [supplies, setSupplies] = useState([]);
  const [supplyName, setSupplyName] = useState("");
  const [supplyUnit, setSupplyUnit] = useState("pieces");
  const [supplyThreshold, setSupplyThreshold] = useState("0");
  const [supplyQuantityDrafts, setSupplyQuantityDrafts] = useState({});
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
  const [config, setConfig] = useState({ channels: [], paymentMethods: [] });
  const [form, setForm] = useState(null);
  const [itemMenu, setItemMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingStockItemId, setSavingStockItemId] = useState("");
  const [stockLoading, setStockLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const currentUser = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "null"); }
    catch { return null; }
  }, []);
  const isAdmin = currentUser?.role === "admin";
  const isBranchManager = currentUser?.role === "branch";
  const canViewInventory = isAdmin || isBranchManager;
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [storeConfig, loadedBranches, branchData] = await Promise.all([
        apiRequest("/api/store-config"),
        isAdmin ? apiRequest("/api/branches") : Promise.resolve([]),
        isBranchManager ? apiRequest("/api/staff/branch") : Promise.resolve(null),
      ]);
      setConfig(storeConfig);
      let branchId = "";
      if (isAdmin) {
        setBranches(loadedBranches);
        branchId = selectedBranchId || loadedBranches[0]?._id || "";
        setSelectedBranchId(branchId);
      } else if (isBranchManager) {
        const branch = branchData?.branch;
        setBranches(branch ? [branch] : []);
        branchId = branch?._id || "";
        setSelectedBranchId(branchId);
      }
      if (canViewInventory && !branchId) {
        setItems([]);
        return;
      }
      const menuItems = await apiRequest(isAdmin ? menuUrl(branchId) : "/api/menu");
      setItems(menuItems);
    } finally {
      setBranchesLoading(false);
      setCatalogLoaded(true);
    }
  }, [canViewInventory, isAdmin, isBranchManager, selectedBranchId]);

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [refresh]);

  const loadBranchStock = useCallback(async () => {
    if (!canViewInventory || !selectedBranchId) {
      setStockByMenuItemId({});
      setStockDraftByMenuItemId({});
      setSupplies([]);
      setSupplyQuantityDrafts({});
      setStockLoading(false);
      return;
    }
    setStockLoading(true);
    try {
      const inventory = await apiRequest(`/api/inventory?branchId=${selectedBranchId}`);
      const quantities = Object.fromEntries(
        inventory.map((entry) => [entry.menuItemId?._id, entry.quantity]),
      );
      setStockByMenuItemId(quantities);
      setStockDraftByMenuItemId(quantities);
      const supplyInventory = await apiRequest(`/api/supply-inventory?branchId=${selectedBranchId}`);
      setSupplies(supplyInventory);
      setSupplyQuantityDrafts(Object.fromEntries(
        supplyInventory.map((entry) => [entry._id, entry.quantity]),
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setStockLoading(false);
      setStockLoaded(true);
    }
  }, [canViewInventory, selectedBranchId]);

  useEffect(() => {
    Promise.resolve().then(() => loadBranchStock());
  }, [loadBranchStock]);

  useEffect(() => {
    if (!itemMenu) return undefined;
    const closeMenu = () => setItemMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemMenu]);

  const visibleItems = items.filter((item) => showArchived || !item.archived);
  const loading = !catalogLoaded || (canViewInventory && Boolean(selectedBranchId) && !stockLoaded);

  const saveItem = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const { stockQuantity, ...menuFields } = form;
    const quantity = Number(stockQuantity);
    const lowStockThreshold = Number(form.lowStockThreshold || 0);
    if (selectedBranchId && (!Number.isInteger(quantity) || quantity < 0)) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setError("Low stock threshold must be a whole number of zero or more.");
      return;
    }
    setBusy(true);
    const payload = {
      ...menuFields,
      price: Number(form.price),
      lowStockThreshold,
      includedFruitPortions: Number(form.includedFruitPortions || 0),
      includedToppingPortions: Number(form.includedToppingPortions || 0),
      includedSaucePortions: Number(form.includedSaucePortions || 0),
      supplyUsage: (form.supplyUsage || []).map((entry) => ({ ...entry, quantity: Number(entry.quantity) })),
      variants: form.variants.map((entry, index) => ({
        ...entry,
        price: Number(entry.price || 0),
        displayOrder: index,
        supplyUsage: (entry.supplyUsage || []).map((usage) => ({ ...usage, quantity: Number(usage.quantity) })),
      })),
      addons: form.addons.map((entry, index) => ({ ...entry, price: Number(entry.price || 0), displayOrder: index })),
    };
    try {
      let savedItem;
      if (form._id) {
        savedItem = await apiRequest(menuUrl(selectedBranchId, form._id), { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        savedItem = await apiRequest(menuUrl(selectedBranchId), { method: "POST", body: JSON.stringify(payload) });
        setForm((current) => current ? { ...current, _id: savedItem._id } : current);
      }
      if (selectedBranchId) {
        await apiRequest(`/api/inventory/${savedItem._id}`, {
          method: "PUT",
          body: JSON.stringify({ branchId: selectedBranchId, quantity }),
        });
      }
      await refresh();
      await loadBranchStock();
      setForm(null);
      setMessage("Menu item saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveStock = async (item) => {
    if (!selectedBranchId) return;
    const quantity = Number(stockDraftByMenuItemId[item._id] ?? 0);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }
    setSavingStockItemId(item._id);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/inventory/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ branchId: selectedBranchId, quantity }),
      });
      setStockByMenuItemId((current) => ({ ...current, [item._id]: quantity }));
      setStockDraftByMenuItemId((current) => ({ ...current, [item._id]: quantity }));
      setMessage(`Stock saved for ${item.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStockItemId("");
    }
  };

  const createSupply = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const supply = await apiRequest("/api/supply-inventory", {
        method: "POST",
        body: JSON.stringify({
          name: supplyName,
          unit: supplyUnit,
          lowStockThreshold: Number(supplyThreshold),
        }),
      });
      setSupplies((current) => [...current, { ...supply, quantity: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplyQuantityDrafts((current) => ({ ...current, [supply._id]: 0 }));
      setSupplyName("");
      setSupplyThreshold("0");
      setShowAddSupplyModal(false);
      setMessage("Supply added. Set its branch stock below.");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveSupplyQuantity = async (supply) => {
    const quantity = Number(supplyQuantityDrafts[supply._id] ?? 0);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/supply-inventory/${supply._id}/stock`, {
        method: "PUT",
        body: JSON.stringify({ branchId: selectedBranchId, quantity }),
      });
      setSupplies((current) => current.map((entry) => entry._id === supply._id ? { ...entry, quantity } : entry));
      setMessage(`Stock saved for ${supply.name}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateSupply = async (supply, changes) => {
    setError("");
    try {
      const saved = await apiRequest(`/api/supply-inventory/${supply._id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setSupplies((current) => current.map((entry) => entry._id === saved._id ? { ...entry, ...saved } : entry));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSupply = async (supply) => {
    if (!window.confirm(`Delete ${supply.name}? This removes its stock records from every branch.`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/supply-inventory/${supply._id}`, { method: "DELETE" });
      setSupplies((current) => current.filter((entry) => entry._id !== supply._id));
      setSupplyQuantityDrafts((current) => {
        const next = { ...current };
        delete next[supply._id];
        return next;
      });
      setMessage(`${supply.name} deleted.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const patchItem = async (item, changes) => {
    setError("");
    try {
      await apiRequest(menuUrl(selectedBranchId, item._id), { method: "PATCH", body: JSON.stringify(changes) });
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const deleteItem = async () => {
    const item = itemMenu?.item;
    setItemMenu(null);
    if (!item || !window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(menuUrl(selectedBranchId, item._id), { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry._id !== item._id));
    } catch (err) { setError(err.message); }
  };

  const moveItem = async (item, delta) => {
    const ordered = [...visibleItems];
    const index = ordered.findIndex((entry) => entry._id === item._id);
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusy(true);
    try {
      await Promise.all(ordered.map((entry, order) => apiRequest(menuUrl(selectedBranchId, entry._id), {
        method: "PATCH", body: JSON.stringify({ displayOrder: order }),
      })));
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const toggleConfig = async (key, entryKey) => {
    if (!isAdmin) return;
    const next = {
      ...config,
      [key]: config[key].map((entry) => entry.key === entryKey ? { ...entry, active: !entry.active } : entry),
    };
    setConfig(next);
    try {
      const saved = await apiRequest("/api/store-config", {
        method: "PATCH", body: JSON.stringify({ [key]: next[key] }),
      });
      setConfig(saved);
    } catch (err) {
      setError(err.message);
      refresh().catch(() => {});
    }
  };

  const updateOption = (kind, index, field, value) => {
    setForm((current) => ({
      ...current,
      [kind]: current[kind].map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option),
    }));
  };

  const addSupplyUsage = (target, optionIndex = -1) => {
    setForm((current) => target === "item"
      ? { ...current, supplyUsage: [...(current.supplyUsage || []), { supplyId: "", quantity: 1 }] }
      : {
          ...current,
          variants: current.variants.map((variant, index) => index === optionIndex
            ? { ...variant, supplyUsage: [...(variant.supplyUsage || []), { supplyId: "", quantity: 1 }] }
            : variant),
        });
  };

  const updateSupplyUsage = (target, optionIndex, usageIndex, field, value) => {
    setForm((current) => {
      if (target === "item") {
        return {
          ...current,
          supplyUsage: current.supplyUsage.map((entry, index) => index === usageIndex
            ? { ...entry, [field]: value }
            : entry),
        };
      }
      return {
        ...current,
        variants: current.variants.map((variant, index) => index === optionIndex
          ? {
              ...variant,
              supplyUsage: (variant.supplyUsage || []).map((entry, usageIndexInVariant) => usageIndexInVariant === usageIndex
                ? { ...entry, [field]: value }
                : entry),
            }
          : variant),
      };
    });
  };

  const removeSupplyUsage = (target, optionIndex, usageIndex) => {
    setForm((current) => target === "item"
      ? { ...current, supplyUsage: current.supplyUsage.filter((_, index) => index !== usageIndex) }
      : {
          ...current,
          variants: current.variants.map((variant, index) => index === optionIndex
            ? { ...variant, supplyUsage: variant.supplyUsage.filter((_, usageIndexInVariant) => usageIndexInVariant !== usageIndex) }
            : variant),
        });
  };

  const moveOption = (kind, index, delta) => {
    setForm((current) => {
      const options = [...current[kind]];
      const target = index + delta;
      if (target < 0 || target >= options.length) return current;
      [options[index], options[target]] = [options[target], options[index]];
      return { ...current, [kind]: options };
    });
  };

  return (
    <MotionConfig reducedMotion="user">
    <section className="space-y-6 text-[#0A3B3D] dark:text-white">
      {loading && <p role="status" className="sr-only">Loading menu...</p>}
      <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Catalog and availability controls</p>
          <h2 className="mt-1 text-2xl font-semibold">Menu management</h2>
        </div>
        {(tab === "items" || tab === "inventory") && isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              {tab === "items" ? "Catalog branch" : "Stock branch"}
              <select
                className={`${inputClass} w-auto min-w-40`}
                value={selectedBranchId}
                onChange={(event) => {
                  setSelectedBranchId(event.target.value);
                  setItems([]);
                  setStockByMenuItemId({});
                  setStockDraftByMenuItemId({});
                  setSupplies([]);
                  setSupplyQuantityDrafts({});
                  setStockLoading(true);
                }}
                disabled={!branches.length}
              >
                {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
              </select>
            </label>
            {tab === "items" && <button type="button" onClick={() => setForm(blankItem(items.length))} disabled={branchesLoading || stockLoading || !selectedBranchId} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#08777a] disabled:opacity-50">
              <Plus size={17} /> Add menu item
            </button>}
          </div>
        )}
      </motion.header>

      <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-800">
        {[
          ["items", "Menu items"],
          ...(canViewInventory ? [["inventory", "Inventory"]] : []),
          ["channels", "Channels & payments"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setForm(null); }} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === id ? "border-[#0A8B8E] text-[#0A8B8E]" : "border-transparent text-gray-500 hover:text-[#0A3B3D] dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-5">
          {tab === "items" ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
                Show archived items
              </label>
              {[0, 1, 2].map((index) => (
                <article key={index} className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-3/4 max-w-80" />
                    <Skeleton className="mt-2 h-4 w-28" />
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-1">
                      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-2 py-1 dark:bg-neutral-950">
                        <Skeleton className="h-8 w-20 rounded-lg" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-8 w-12 rounded-lg" />
                      </div>
                      {[0, 1].map((button) => <Skeleton key={button} className="h-9 w-9 rounded-lg" />)}
                      {[0, 1, 2].map((button) => <Skeleton key={button} className="h-9 w-16 rounded-lg" />)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : tab === "inventory" && canViewInventory ? (
            <div className="space-y-5">
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
              <section className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
                  <div>
                    <h3 className="font-semibold">Supply stock</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Current quantities at {branches.find((branch) => branch._id === selectedBranchId)?.name || "the selected branch"}. Sales deduct configured usage automatically.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Supply</th>
                        <th className="px-5 py-3">Stock</th>
                        <th className="px-5 py-3">Low threshold</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                      {[0, 1, 2].map((index) => (
                        <tr key={index}>
                          <td className="px-5 py-4">
                            <Skeleton className="h-9 w-44 rounded-lg" />
                            <div className="mt-2 flex items-center gap-2">
                              <Skeleton className="h-3 w-8" />
                              <Skeleton className="h-7 w-28 rounded-lg" />
                            </div>
                          </td>
                          <td className="px-5 py-4"><div className="flex items-center gap-2"><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-3 w-10" /></div></td>
                          <td className="px-5 py-4"><Skeleton className="h-9 w-28 rounded-lg" /></td>
                          <td className="px-5 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                          <td className="px-5 py-4"><div className="flex justify-end gap-2">{[0, 1, 2, 3].map((action) => <Skeleton key={action} className="h-8 w-16 rounded-lg" />)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {[["channels", "Sales channels", "Choose where orders may be accepted."], ["paymentMethods", "Payment methods", "Choose which payment methods are available."]].map(([key, title, description]) => (
                <section key={key} className={`${cardClass} space-y-4`}>
                  <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-neutral-800">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-5 rounded" />
                    </div>
                  ))}
                  {!isAdmin && <p className="text-xs text-gray-500">Only administrators can change availability.</p>}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : <FadeIn key={tab} from="bottom" delay={0.15}><>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}

      {tab === "items" && form && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setForm(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="menu-form-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
        <form onSubmit={saveItem} className="space-y-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-semibold text-[#0A8B8E]">Menu catalog</p><h3 id="menu-form-title" className="mt-1 text-lg font-semibold">{form._id ? "Edit menu item" : "New menu item"}</h3></div>
            <button type="button" onClick={() => setForm(null)} disabled={busy} aria-label="Close form" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-neutral-800"><X size={18} /></button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Item name<input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={form.itemType === "addon" ? "e.g. Chocolate sauce" : "e.g. Soft-serve cone"} required /></label>
            <label className="space-y-1 text-sm">Catalog type<select className={inputClass} value={form.itemType || "product"} onChange={(e) => setForm({ ...form, itemType: e.target.value, category: e.target.value === "addon" ? "Toppings" : "Soft-Serve" })}><option value="product">Product customers order</option><option value="addon">Add-on customers choose</option></select></label>
            <label className="space-y-1 text-sm">Category{form.itemType === "addon" ? <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required><option value="Sauces">Sauces</option><option value="Fruits">Fruits</option><option value="Toppings">Toppings</option></select> : <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>{!["Soft-Serve", "Frozen Yogurt", "Float", "Yogurt Parfait", "Parfait", "Cremdae"].includes(form.category) && <option value={form.category}>{form.category}</option>}{["Soft-Serve", "Frozen Yogurt", "Float", "Yogurt Parfait", "Parfait", "Cremdae"].map((category) => <option key={category}>{category}</option>)}</select>}</label>
            <label className="space-y-1 text-sm">{form.itemType === "addon" ? "Price per add" : "Base price"}<input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label className="space-y-1 text-sm sm:col-span-2">Description<textarea className={inputClass} rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          {selectedBranchId ? (
            <label className="block max-w-xs space-y-1 text-sm font-medium">
              Stock at {branches.find((branch) => branch._id === selectedBranchId)?.name || "selected branch"} <span className="font-normal text-gray-500">({form.itemType === "addon" ? "portions" : "items"})</span>
              <input className={inputClass} type="number" min="0" step="1" value={form.stockQuantity ?? "0"} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} required />
            </label>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Create a branch first to set branch stock.</p>
          )}
          <label className="block max-w-xs space-y-1 text-sm font-medium">
            Low stock alert threshold
            <input className={inputClass} type="number" min="0" step="1" value={form.lowStockThreshold ?? "0"} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} required />
            <span className="block text-xs font-normal text-gray-500">Notify the branch manager when stock crosses down to this amount.</span>
          </label>
          {form.itemType === "product" && <div className="space-y-3 rounded-xl border border-[#0A8B8E]/15 bg-[#0A8B8E]/5 p-4">
            <div><h4 className="font-semibold">Included choices</h4><p className="mt-1 text-xs text-gray-500">Set included portions for parfait products. Extra portions use each add-on’s price.</p></div>
            <div className="grid gap-3 sm:grid-cols-3">{[["includedFruitPortions", "Fruit portions"], ["includedToppingPortions", "Topping portions"], ["includedSaucePortions", "Sauce portions"]].map(([key, label]) => <label key={key} className="space-y-1 text-sm">{label}<input className={inputClass} type="number" min="0" step="1" value={form[key] ?? 0} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
          </div>}
          {form.itemType === "product" && <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-neutral-700">
            <div className="flex items-center justify-between gap-3"><div><h4 className="font-semibold">Supplies used for every item</h4><p className="mt-1 text-xs text-gray-500">These quantities are added to any supply usage configured on the selected variant.</p></div><button type="button" onClick={() => addSupplyUsage("item")} className="shrink-0 text-sm font-medium text-[#0A8B8E]">+ Add supply</button></div>
            {(form.supplyUsage || []).map((usage, index) => <div key={`item-supply-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2">
              <select className={inputClass} value={usage.supplyId} onChange={(event) => updateSupplyUsage("item", -1, index, "supplyId", event.target.value)} required>
                <option value="">Choose a supply</option>{supplies.filter((supply) => supply.active).map((supply) => <option key={supply._id} value={supply._id}>{supply.name} ({supply.unit})</option>)}
              </select>
              <input className={inputClass} type="number" min="1" step="1" value={usage.quantity} aria-label="Supply quantity per item" onChange={(event) => updateSupplyUsage("item", -1, index, "quantity", event.target.value)} required />
              <button type="button" onClick={() => removeSupplyUsage("item", -1, index)} aria-label="Remove supply usage" className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><X size={17} /></button>
            </div>)}
            {!supplies.some((supply) => supply.active) && <p className="text-xs text-gray-500">Add a supply in the Inventory tab first.</p>}
          </div>}
          {(form.itemType === "product" ? [["variants", "Variants / cup sizes"], ["addons", "Legacy add-ons / syrups"]] : []).map(([kind, title]) => (
            <div key={kind} className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-950">
              <div className="flex items-center justify-between"><h4 className="font-semibold">{title}</h4><button type="button" onClick={() => setForm({ ...form, [kind]: [...form[kind], { name: "", price: 0, active: true, supplyUsage: [] }] })} className="text-sm font-medium text-[#0A8B8E]">+ Add option</button></div>
              {!form[kind].length && <p className="text-sm text-gray-500">No options added.</p>}
              {form[kind].map((option, index) => (
                <div key={`${kind}-${index}`} className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_auto_auto_auto_auto] items-center gap-2">
                  <input className={inputClass} aria-label={`${title} name`} placeholder="Option name" value={option.name} onChange={(e) => updateOption(kind, index, "name", e.target.value)} required />
                  <input className={inputClass} aria-label={`${title} price`} type="number" min="0" step="0.01" placeholder="Price" value={option.price} onChange={(e) => updateOption(kind, index, "price", e.target.value)} required />
                  <input type="checkbox" aria-label={`${title} available`} checked={option.active !== false} onChange={(e) => updateOption(kind, index, "active", e.target.checked)} className="h-4 w-4 accent-[#0A8B8E]" />
                  <button type="button" disabled={index === 0} onClick={() => moveOption(kind, index, -1)} title="Move option up" className="rounded p-1 text-gray-500 disabled:opacity-30"><ArrowUp size={15} /></button>
                  <button type="button" disabled={index === form[kind].length - 1} onClick={() => moveOption(kind, index, 1)} title="Move option down" className="rounded p-1 text-gray-500 disabled:opacity-30"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => setForm({ ...form, [kind]: form[kind].filter((_, i) => i !== index) })} aria-label="Remove option" className="rounded-lg px-3 text-gray-500 hover:bg-red-50 hover:text-red-600"><X size={18} /></button>
                </div>
                {kind === "variants" && <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
                  <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-600 dark:text-gray-300">Additional supplies for {option.name || "this variant"}</p><button type="button" onClick={() => addSupplyUsage("variant", index)} className="text-xs font-medium text-[#0A8B8E]">+ Add supply</button></div>
                  {(option.supplyUsage || []).map((usage, usageIndex) => <div key={`variant-supply-${index}-${usageIndex}`} className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2">
                    <select className={inputClass} value={usage.supplyId} onChange={(event) => updateSupplyUsage("variant", index, usageIndex, "supplyId", event.target.value)} required><option value="">Choose a supply</option>{supplies.filter((supply) => supply.active).map((supply) => <option key={supply._id} value={supply._id}>{supply.name} ({supply.unit})</option>)}</select>
                    <input className={inputClass} type="number" min="1" step="1" value={usage.quantity} aria-label={`Supply quantity for ${option.name}`} onChange={(event) => updateSupplyUsage("variant", index, usageIndex, "quantity", event.target.value)} required />
                    <button type="button" onClick={() => removeSupplyUsage("variant", index, usageIndex)} aria-label="Remove variant supply usage" className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><X size={17} /></button>
                  </div>)}
                </div>}
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-50 dark:border-neutral-700">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save size={16} />{busy ? "Saving…" : "Save item"}</button></div>
        </form>
        </section>
        </div>
      )}

      {tab === "items" && !form && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived items</label>
          {!visibleItems.length && <div className={cardClass}><p className="text-sm text-gray-500">{isAdmin && !selectedBranchId ? "Create a branch before setting up a menu." : "No menu items in this branch yet."}{isAdmin && selectedBranchId ? " Add the first item to begin building this branch’s catalog." : ""}</p></div>}
          {visibleItems.map((item, index) => (
            <article key={item._id} onContextMenu={isAdmin ? (event) => {
              event.preventDefault();
              setItemMenu({ item, x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 60) });
            } : undefined} className={`${cardClass} flex flex-wrap items-center justify-between gap-4 ${item.archived ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-neutral-800">{item.category}</span><span className="rounded-full bg-[#0A8B8E]/10 px-2.5 py-1 text-xs font-medium text-[#0A6B6E] dark:text-teal-300">{item.itemType === "addon" ? "Add-on" : "Product"}</span><span className={`rounded-full px-2.5 py-1 text-xs ${item.active && !item.archived ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-neutral-800"}`}>{item.archived ? "Archived" : item.active ? "Available" : "Unavailable"}</span></div>
                {item.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>}
                <p className="mt-2 text-sm font-semibold">₱{Number(item.price).toFixed(2)} <span className="font-normal text-gray-500">{item.itemType === "addon" ? "per add" : "base price"}</span>{item.variants?.length > 0 && <span className="ml-2 font-normal text-gray-500">· {item.variants.filter((x) => x.active).length} variants</span>}{item.addons?.length > 0 && <span className="ml-2 font-normal text-gray-500">· {item.addons.filter((x) => x.active).length} add-ons</span>}</p>
              </div>
              {isAdmin && <div className="flex flex-wrap items-center gap-1">
                {selectedBranchId && <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-2 py-1 dark:bg-neutral-950">
                  <label className="sr-only" htmlFor={`menu-stock-${item._id}`}>Stock at selected branch for {item.name}</label>
                  <input
                    id={`menu-stock-${item._id}`}
                    className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    type="number"
                    min="0"
                    step="1"
                    value={stockDraftByMenuItemId[item._id] ?? 0}
                    onChange={(event) => setStockDraftByMenuItemId((current) => ({ ...current, [item._id]: event.target.value }))}
                    disabled={stockLoading}
                  />
                  <span className="text-xs text-gray-500">{item.itemType === "addon" ? "portions" : "items"}</span>
                  <button type="button" onClick={() => saveStock(item)} disabled={stockLoading || savingStockItemId === item._id} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0A8B8E] hover:bg-[#0A8B8E]/10 disabled:opacity-50">
                    {savingStockItemId === item._id ? "Saving…" : "Save"}
                  </button>
                </div>}
                <button disabled={index === 0 || busy} onClick={() => moveItem(item, -1)} title="Move up" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowUp size={17} /></button>
                <button disabled={index === visibleItems.length - 1 || busy} onClick={() => moveItem(item, 1)} title="Move down" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowDown size={17} /></button>
                {!item.archived && <button onClick={() => patchItem(item, { active: !item.active })} className="rounded-lg px-3 py-2 text-sm text-[#0A8B8E] hover:bg-[#0A8B8E]/10">{item.active ? "Disable" : "Enable"}</button>}
                <button type="button" disabled={stockLoading} onClick={() => setForm({ ...item, itemType: item.itemType || "product", price: String(item.price), lowStockThreshold: String(item.lowStockThreshold ?? 0), includedFruitPortions: String(item.includedFruitPortions || 0), includedToppingPortions: String(item.includedToppingPortions || 0), includedSaucePortions: String(item.includedSaucePortions || 0), stockQuantity: String(stockByMenuItemId[item._id] ?? 0), variants: item.variants || [], addons: item.addons || [] })} className="rounded-lg px-3 py-2 text-sm text-[#0A8B8E] hover:bg-[#0A8B8E]/10 disabled:opacity-50">Edit</button>
                <button onClick={() => patchItem(item, { archived: !item.archived })} title={item.archived ? "Restore item" : "Archive item"} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"><Archive size={17} /></button>
              </div>}
            </article>
          ))}
        </div>
      )}

      {itemMenu && isAdmin && (
        <div className="fixed z-50 min-w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" style={{ left: itemMenu.x, top: itemMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={deleteItem} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
            <Trash2 size={16} /> Delete menu item
          </button>
        </div>
      )}

      {tab === "inventory" && canViewInventory && (
        <div className="space-y-5">
          {!selectedBranchId ? (
            <div className={cardClass}><p className="text-sm text-gray-500">{isAdmin ? "Add a branch before managing supply inventory." : "Your account is not assigned to a branch."}</p></div>
          ) : (
            <>
              {isAdmin && <div className="flex justify-end"><button type="button" onClick={() => setShowAddSupplyModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#08777a]"><Plus size={17} /> Add supply</button></div>}

              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
                  <h3 className="font-semibold">Menu item stock</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Current quantities and low-stock thresholds at {branches.find((branch) => branch._id === selectedBranchId)?.name || "your branch"}.
                  </p>
                </div>
                {stockLoading ? <p className="p-5 text-sm text-gray-500">Loading menu item stock...</p> : !items.length ? <p className="p-5 text-sm text-gray-500">No menu items in this branch.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-150 text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
                        <tr><th className="px-5 py-3">Menu item</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Low threshold</th><th className="px-5 py-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {items.map((item) => {
                          const quantity = stockByMenuItemId[item._id] ?? 0;
                          const isLow = quantity <= (item.lowStockThreshold ?? 0);
                          const unit = item.itemType === "addon" ? "portions" : "items";
                          return (
                            <tr key={item._id} className={item.archived || !item.active ? "opacity-60" : ""}>
                              <td className="px-5 py-4"><span className="font-medium">{item.name}</span><span className="ml-2 text-xs text-gray-500">{item.itemType === "addon" ? "Add-on" : "Product"}</span></td>
                              <td className="px-5 py-4">{quantity} {unit}</td>
                              <td className="px-5 py-4">{item.lowStockThreshold ?? 0}</td>
                              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${!item.active || item.archived ? "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300" : isLow ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{item.archived ? "Archived" : !item.active ? "Inactive" : isLow ? "Low stock" : "In stock"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><div><h3 className="font-semibold">Supply stock</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Current quantities at {branches.find((branch) => branch._id === selectedBranchId)?.name || "the selected branch"}. Sales deduct configured usage automatically.</p></div></div>
                {stockLoading ? <p className="p-5 text-sm text-gray-500">Loading supply stock...</p> : !supplies.length ? <p className="p-5 text-sm text-gray-500">No supplies yet. Add cups, cones, or other items above.</p> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-190 text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400"><tr><th className="px-5 py-3">Supply</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Low threshold</th><th className="px-5 py-3">Status</th>{isAdmin && <th className="px-5 py-3 text-right">Actions</th>}</tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">{supplies.map((supply) => {
                      const isLow = supply.quantity <= supply.lowStockThreshold;
                      return <tr key={supply._id} className={!supply.active ? "opacity-60" : ""}>
                        <td className="px-5 py-4">
                          {isAdmin ? <><input className="w-44 rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium dark:border-neutral-700 dark:bg-neutral-950" aria-label={`${supply.name} name`} value={supply.name} onChange={(event) => setSupplies((current) => current.map((entry) => entry._id === supply._id ? { ...entry, name: event.target.value } : entry))} /><div className="mt-2 flex items-center gap-2"><span className="text-xs text-gray-500">Unit</span><input className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-950" aria-label={`${supply.name} unit`} value={supply.unit} onChange={(event) => setSupplies((current) => current.map((entry) => entry._id === supply._id ? { ...entry, unit: event.target.value } : entry))} /></div></> : <><span className="font-medium">{supply.name}</span><div className="mt-1 text-xs text-gray-500">{supply.unit}</div></>}
                        </td>
                        <td className="px-5 py-4">{isAdmin ? <div className="flex items-center gap-2"><input className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" type="number" min="0" step="1" aria-label={`${supply.name} stock quantity`} value={supplyQuantityDrafts[supply._id] ?? 0} onChange={(event) => setSupplyQuantityDrafts((current) => ({ ...current, [supply._id]: event.target.value }))} disabled={!supply.active} /><span className="text-xs text-gray-500">{supply.unit}</span></div> : <>{supply.quantity} {supply.unit}</>}</td>
                        <td className="px-5 py-4">{isAdmin ? <input className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" type="number" min="0" step="1" aria-label={`${supply.name} low stock threshold`} value={supply.lowStockThreshold} onChange={(event) => setSupplies((current) => current.map((entry) => entry._id === supply._id ? { ...entry, lowStockThreshold: event.target.value } : entry))} /> : supply.lowStockThreshold}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${!supply.active ? "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300" : isLow ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{!supply.active ? "Inactive" : isLow ? "Low stock" : "In stock"}</span></td>
                        {isAdmin && <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => saveSupplyQuantity(supply)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#0A8B8E] hover:bg-[#0A8B8E]/10">Save stock</button><button type="button" onClick={() => updateSupply(supply, { name: supply.name, unit: supply.unit, lowStockThreshold: Number(supply.lowStockThreshold) })} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#0A8B8E] hover:bg-[#0A8B8E]/10">Save details</button><button type="button" onClick={() => updateSupply(supply, { active: !supply.active })} className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800">{supply.active ? "Disable" : "Enable"}</button><button type="button" onClick={() => deleteSupply(supply)} className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">Delete</button></div></td>}
                      </tr>;
                    })}</tbody>
                  </table></div>
                )}
              </section>

              {showAddSupplyModal && isAdmin && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddSupplyModal(false); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="add-supply-title" className={`${cardClass} w-full max-w-lg p-6`}>
                  <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#0A8B8E]">Branch inventory</p><h3 id="add-supply-title" className="mt-1 text-xl font-semibold">Add a supply</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This supply will be available to track across all branches.</p></div><button type="button" onClick={() => setShowAddSupplyModal(false)} aria-label="Close add supply dialog" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"><X size={18} /></button></div>
                  {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
                  <form onSubmit={createSupply} className="mt-5 space-y-4">
                    <label className="block space-y-1.5 text-sm font-medium">Supply name<input className={inputClass} value={supplyName} onChange={(event) => setSupplyName(event.target.value)} placeholder="Cups, cones, spoons..." required /></label>
                    <label className="block space-y-1.5 text-sm font-medium">Unit<input className={inputClass} value={supplyUnit} onChange={(event) => setSupplyUnit(event.target.value)} placeholder="pieces, sleeves" required /></label>
                    <label className="block space-y-1.5 text-sm font-medium">Low stock threshold<input className={inputClass} type="number" min="0" step="1" value={supplyThreshold} onChange={(event) => setSupplyThreshold(event.target.value)} required /><span className="block text-xs font-normal text-gray-500">Show a low stock warning when quantity reaches this number.</span></label>
                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-neutral-800"><button type="button" onClick={() => setShowAddSupplyModal(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-700">Cancel</button><button className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#08777a]"><Plus size={16} /> Add supply</button></div>
                  </form>
                </section>
              </div>}
            </>
          )}
        </div>
      )}

      {tab === "channels" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {[ ["channels", "Sales channels", "Choose where orders may be accepted."], ["paymentMethods", "Payment methods", "Choose which payment methods are available."] ].map(([key, title, description]) => (
            <section key={key} className={`${cardClass} space-y-4`}>
              <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>
              {config[key]?.map((entry) => <label key={entry.key} className="flex cursor-pointer items-center justify-between border-t border-gray-100 pt-4 dark:border-neutral-800"><span className="font-medium">{entry.name}</span><input type="checkbox" checked={entry.active} disabled={!isAdmin} onChange={() => toggleConfig(key, entry.key)} className="h-5 w-5 accent-[#0A8B8E]" /></label>)}
              {!isAdmin && <p className="text-xs text-gray-500">Only administrators can change availability.</p>}
            </section>
          ))}
        </div>
      )}
      </></FadeIn>}
      <AnimatePresence>{loading && <StreakBar />}</AnimatePresence>
    </section>
    </MotionConfig>
  );
}
