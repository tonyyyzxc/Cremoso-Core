import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const blankItem = (displayOrder = 0) => ({
  name: "",
  description: "",
  category: "",
  price: "",
  active: true,
  archived: false,
  displayOrder,
  variants: [],
  addons: [],
});

const cardClass = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0A8B8E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";

export default function MenuPage() {
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [config, setConfig] = useState({ channels: [], paymentMethods: [] });
  const [form, setForm] = useState(null);
  const [itemMenu, setItemMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "null")?.role === "admin"; }
    catch { return false; }
  }, []);

  const refresh = useCallback(async () => {
    const [menuItems, storeConfig] = await Promise.all([
      apiRequest("/api/menu"),
      apiRequest("/api/store-config"),
    ]);
    setItems(menuItems);
    setConfig(storeConfig);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [refresh]);

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

  const saveItem = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      price: Number(form.price),
      variants: form.variants.map((entry, index) => ({ ...entry, price: Number(entry.price || 0), displayOrder: index })),
      addons: form.addons.map((entry, index) => ({ ...entry, price: Number(entry.price || 0), displayOrder: index })),
    };
    try {
      if (form._id) {
        await apiRequest(`/api/menu/${form._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/api/menu", { method: "POST", body: JSON.stringify(payload) });
      }
      await refresh();
      setForm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const patchItem = async (item, changes) => {
    setError("");
    try {
      await apiRequest(`/api/menu/${item._id}`, { method: "PATCH", body: JSON.stringify(changes) });
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const deleteItem = async () => {
    const item = itemMenu?.item;
    setItemMenu(null);
    if (!item || !window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/menu/${item._id}`, { method: "DELETE" });
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
      await Promise.all(ordered.map((entry, order) => apiRequest(`/api/menu/${entry._id}`, {
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
    <section className="space-y-6 text-[#0A3B3D] dark:text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Catalog and availability controls</p>
          <h2 className="mt-1 text-2xl font-semibold">Menu management</h2>
        </div>
        {tab === "items" && isAdmin && !form && (
          <button onClick={() => setForm(blankItem(items.length))} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#08777a]">
            <Plus size={17} /> Add menu item
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-800">
        {[ ["items", "Menu items"], ["channels", "Channels & payments"] ].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setForm(null); }} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === id ? "border-[#0A8B8E] text-[#0A8B8E]" : "border-transparent text-gray-500 hover:text-[#0A3B3D] dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {tab === "items" && form && isAdmin && (
        <form onSubmit={saveItem} className={`${cardClass} space-y-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{form._id ? "Edit menu item" : "New menu item"}</h3>
            <button type="button" onClick={() => setForm(null)} aria-label="Close form" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"><X size={18} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Item name<input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="space-y-1 text-sm">Category<input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Frozen yogurt" required /></label>
            <label className="space-y-1 text-sm">Base price<input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label className="space-y-1 text-sm sm:col-span-2">Description<textarea className={inputClass} rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          {[["variants", "Variants / cup sizes"], ["addons", "Add-ons / syrups"]].map(([kind, title]) => (
            <div key={kind} className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-950">
              <div className="flex items-center justify-between"><h4 className="font-semibold">{title}</h4><button type="button" onClick={() => setForm({ ...form, [kind]: [...form[kind], { name: "", price: 0, active: true }] })} className="text-sm font-medium text-[#0A8B8E]">+ Add option</button></div>
              {!form[kind].length && <p className="text-sm text-gray-500">No options added.</p>}
              {form[kind].map((option, index) => (
                <div key={`${kind}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_auto_auto_auto_auto] items-center gap-2">
                  <input className={inputClass} aria-label={`${title} name`} placeholder="Option name" value={option.name} onChange={(e) => updateOption(kind, index, "name", e.target.value)} required />
                  <input className={inputClass} aria-label={`${title} price`} type="number" min="0" step="0.01" placeholder="Price" value={option.price} onChange={(e) => updateOption(kind, index, "price", e.target.value)} required />
                  <input type="checkbox" aria-label={`${title} available`} checked={option.active !== false} onChange={(e) => updateOption(kind, index, "active", e.target.checked)} className="h-4 w-4 accent-[#0A8B8E]" />
                  <button type="button" disabled={index === 0} onClick={() => moveOption(kind, index, -1)} title="Move option up" className="rounded p-1 text-gray-500 disabled:opacity-30"><ArrowUp size={15} /></button>
                  <button type="button" disabled={index === form[kind].length - 1} onClick={() => moveOption(kind, index, 1)} title="Move option down" className="rounded p-1 text-gray-500 disabled:opacity-30"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => setForm({ ...form, [kind]: form[kind].filter((_, i) => i !== index) })} aria-label="Remove option" className="rounded-lg px-3 text-gray-500 hover:bg-red-50 hover:text-red-600"><X size={18} /></button>
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-neutral-700">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save size={16} />{busy ? "Saving…" : "Save item"}</button></div>
        </form>
      )}

      {tab === "items" && !form && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived items</label>
          {!visibleItems.length && <div className={cardClass}><p className="text-sm text-gray-500">No menu items yet.{isAdmin ? " Add your first item to begin." : ""}</p></div>}
          {visibleItems.map((item, index) => (
            <article key={item._id} onContextMenu={isAdmin ? (event) => {
              event.preventDefault();
              setItemMenu({ item, x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 60) });
            } : undefined} className={`${cardClass} flex flex-wrap items-center justify-between gap-4 ${item.archived ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-neutral-800">{item.category}</span><span className={`rounded-full px-2.5 py-1 text-xs ${item.active && !item.archived ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-neutral-800"}`}>{item.archived ? "Archived" : item.active ? "Available" : "Unavailable"}</span></div>
                {item.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>}
                <p className="mt-2 text-sm font-semibold">₱{Number(item.price).toFixed(2)}{item.variants?.length > 0 && <span className="ml-2 font-normal text-gray-500">· {item.variants.filter((x) => x.active).length} variants</span>}{item.addons?.length > 0 && <span className="ml-2 font-normal text-gray-500">· {item.addons.filter((x) => x.active).length} add-ons</span>}</p>
              </div>
              {isAdmin && <div className="flex items-center gap-1">
                <button disabled={index === 0 || busy} onClick={() => moveItem(item, -1)} title="Move up" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowUp size={17} /></button>
                <button disabled={index === visibleItems.length - 1 || busy} onClick={() => moveItem(item, 1)} title="Move down" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowDown size={17} /></button>
                {!item.archived && <button onClick={() => patchItem(item, { active: !item.active })} className="rounded-lg px-3 py-2 text-sm text-[#0A8B8E] hover:bg-[#0A8B8E]/10">{item.active ? "Disable" : "Enable"}</button>}
                <button onClick={() => setForm({ ...item, price: String(item.price), variants: item.variants || [], addons: item.addons || [] })} className="rounded-lg px-3 py-2 text-sm text-[#0A8B8E] hover:bg-[#0A8B8E]/10">Edit</button>
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
    </section>
  );
}
