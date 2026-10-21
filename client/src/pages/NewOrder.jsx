import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:cursor-not-allowed disabled:opacity-50";

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function getIncludedPortions(item, category) {
  if (category === "Fruits") return Number(item.includedFruitPortions || 0);
  if (category === "Toppings") return Number(item.includedToppingPortions || 0);
  if (category === "Sauces") return Number(item.includedSaucePortions || 0);
  return 0;
}

function getUnitPrice(item, variant, addons, portionChoices) {
  const selections = Object.entries(portionChoices).map(([id, quantity]) => ({ addon: addons.find((entry) => entry._id === id), quantity: Number(quantity) })).filter((entry) => entry.addon && entry.quantity > 0);
  const categoryTotals = new Map();
  selections.forEach(({ addon, quantity }) => categoryTotals.set(addon.category, (categoryTotals.get(addon.category) || 0) + quantity));
  const includedRemaining = new Map([...categoryTotals.keys()].map((category) => [category, getIncludedPortions(item, category)]));
  const portionCost = selections.reduce((sum, { addon, quantity }) => {
    const free = Math.min(includedRemaining.get(addon.category) || 0, quantity);
    includedRemaining.set(addon.category, (includedRemaining.get(addon.category) || 0) - free);
    return sum + addon.price * (quantity - free);
  }, 0);
  return Number(item.price) + Number(variant?.price || 0) + portionCost;
}

function ItemCard({ item, stockQuantity, onChoose }) {
  const isAvailable = item.active && !item.archived && stockQuantity > 0;
  const activeVariants = item.variants?.filter((variant) => variant.active) || [];
  const activeAddons = item.addons?.filter((addon) => addon.active) || [];

  return (
    <article className={`${cardClass} flex min-h-52 flex-col p-5 transition hover:-translate-y-0.5 hover:border-[#0A8B8E]/40 hover:shadow-md ${!isAvailable ? "opacity-65" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A8B8E]/10 text-[#0A8B8E]">
          <UtensilsCrossed size={20} />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAvailable ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300"}`}>
          {!item.active || item.archived ? "Unavailable" : stockQuantity > 0 ? `${stockQuantity} in stock` : "Out of stock"}
        </span>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0A8B8E]">{item.category}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-semibold">{money(item.price)} <span className="text-xs font-normal text-gray-500">base</span></p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{activeVariants.length} variant{activeVariants.length === 1 ? "" : "s"} · {activeAddons.length} add-on{activeAddons.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" onClick={() => onChoose(item)} disabled={!isAvailable} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A8B8E]/10 text-[#0A8B8E] transition hover:bg-[#0A8B8E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Customize ${item.name}`} title="Customize item">
          <Plus size={19} />
        </button>
      </div>
    </article>
  );
}

function QuantityControl({ quantity, onChange, label, maxQuantity = 99 }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-neutral-700" aria-label={label}>
      <button type="button" onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} className="rounded-l-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-neutral-800" aria-label="Decrease quantity"><Minus size={14} /></button>
      <span className="min-w-9 px-2 text-center text-sm font-semibold">{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)} disabled={quantity >= maxQuantity} className="rounded-r-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-neutral-800" aria-label="Increase quantity"><Plus size={14} /></button>
    </div>
  );
}

export default function NewOrderPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [stockByItemId, setStockByItemId] = useState({});
  const [channels, setChannels] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All items");
  const [customer, setCustomer] = useState("");
  const [channel, setChannel] = useState("");
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [selectedPortions, setSelectedPortions] = useState({});
  const [customQuantity, setCustomQuantity] = useState(1);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, config, inventory] = await Promise.all([
        apiRequest("/api/menu"),
        apiRequest("/api/store-config"),
        apiRequest("/api/inventory"),
      ]);
      setMenuItems(items.filter((item) => !item.archived && item.active).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
      setStockByItemId(Object.fromEntries(inventory.map((entry) => [entry.menuItemId?._id, entry.quantity])));
      const activeChannels = (config.channels || []).filter((entry) => entry.active);
      setChannels(activeChannels);
      setChannel((current) => activeChannels.some((entry) => entry.key === current) ? current : activeChannels[0]?.key || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    apiRequest("/api/staff/branch")
      .then((data) => setBranchName(data.branch?.name || ""))
      .catch(() => setBranchName(""));
  }, []);

  const categories = useMemo(() => [
    "All items",
    ...new Set(menuItems.filter((item) => item.itemType !== "addon").map((item) => item.category).filter(Boolean).sort((a, b) => a.localeCompare(b))),
  ], [menuItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menuItems.filter((item) => item.itemType !== "addon").filter((item) => {
      const matchesCategory = category === "All items" || item.category === category;
      const matchesSearch = !term || [item.name, item.category, item.description].some((value) => value?.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, search, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const availableVariants = customizingItem?.variants?.filter((variant) => variant.active) || [];
  const availableAddons = customizingItem?.addons?.filter((addon) => addon.active) || [];
  const availablePortionItems = menuItems.filter((item) => item.itemType === "addon" && item.active && !item.archived);
  const selectedVariant = availableVariants.find((variant) => variant._id === selectedVariantId) || null;
  const selectedAddons = availableAddons.filter((addon) => selectedAddonIds.includes(addon._id));
  const customizationPrice = customizingItem ? getUnitPrice(customizingItem, selectedVariant, availablePortionItems, selectedPortions) + selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0) : 0;
  const cartQuantityForCustomizingItem = customizingItem
    ? cart.filter((entry) => entry.menuItemId === customizingItem._id).reduce((sum, entry) => sum + entry.quantity, 0)
    : 0;
  const remainingCustomizingStock = customizingItem
    ? Math.max(0, (stockByItemId[customizingItem._id] || 0) - cartQuantityForCustomizingItem)
    : 0;
  const remainingPortionStock = (addonId) => Math.max(0, (stockByItemId[addonId] || 0) - cart.reduce(
    (sum, item) => sum + (item.portionAddons || []).filter((addon) => addon.id === addonId).reduce((portionSum, addon) => portionSum + addon.quantity * item.quantity, 0),
    0,
  ));

  const openCustomizer = (item) => {
    setCustomizingItem(item);
    setSelectedVariantId("");
    setSelectedAddonIds([]);
    setSelectedPortions({});
    setCustomQuantity(1);
  };

  const addCustomizedItem = (event) => {
    event.preventDefault();
    if (!customizingItem) return;
    if (availableVariants.length && !selectedVariantId) {
      setError("Choose a variant before adding this item.");
      return;
    }
    if (customQuantity > remainingCustomizingStock) {
      setError("There is not enough stock remaining for this quantity.");
      return;
    }
    const addons = [...selectedAddons].sort((a, b) => a._id.localeCompare(b._id));
    const portionSelections = Object.entries(selectedPortions).filter(([, quantity]) => Number(quantity) > 0).map(([id, quantity]) => ({ addon: availablePortionItems.find((entry) => entry._id === id), quantity: Number(quantity) })).filter((selection) => selection.addon);
    for (const { addon, quantity } of portionSelections) {
      if (quantity * customQuantity > remainingPortionStock(addon._id)) {
        setError(`There is not enough ${addon.name} stock for this order quantity.`);
        return;
      }
    }
    for (const [category, field] of [["Fruits", "includedFruitPortions"], ["Toppings", "includedToppingPortions"], ["Sauces", "includedSaucePortions"]]) {
      const required = Number(customizingItem[field] || 0);
      const selected = portionSelections.filter((entry) => entry.addon.category === category).reduce((sum, entry) => sum + entry.quantity, 0);
      if (selected < required) {
        setError(`Choose at least ${required} ${category.toLowerCase()} portion${required === 1 ? "" : "s"}.`);
        return;
      }
    }
    const portions = portionSelections.map(({ addon, quantity }) => ({ id: addon._id, name: addon.name, category: addon.category, price: Number(addon.price), quantity }));
    const key = `${customizingItem._id}:${selectedVariantId || "base"}:${addons.map((addon) => addon._id).join(",")}:${portions.map((addon) => `${addon.id}x${addon.quantity}`).join(",")}`;
    const variantSnapshot = selectedVariant ? { id: selectedVariant._id, name: selectedVariant.name, price: Number(selectedVariant.price) } : null;
    const addonSnapshots = addons.map((addon) => ({ id: addon._id, name: addon.name, price: Number(addon.price) }));
    setCart((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) return current.map((entry) => entry.key === key ? { ...entry, quantity: Math.min(99, entry.quantity + customQuantity) } : entry);
      return [...current, {
        key,
        menuItemId: customizingItem._id,
        name: customizingItem.name,
        category: customizingItem.category,
        variant: variantSnapshot,
        addons: addonSnapshots,
        portionAddons: portions,
        quantity: customQuantity,
        unitPrice: customizationPrice,
      }];
    });
    setCustomizingItem(null);
    setError("");
  };

  const updateCartQuantity = (key, quantity) => {
    setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item));
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!cart.length) return;
    if (!channel) {
      setError("There are no active sales channels. Ask an administrator to enable one.");
      return;
    }
    setPlacingOrder(true);
    setError("");
    try {
      const order = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: customer.trim() || "Walk-in",
          channel,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variant?.id || "",
            addonIds: item.addons.map((addon) => addon.id),
            addonSelections: (item.portionAddons || []).map((addon) => ({ menuItemId: addon.id, quantity: addon.quantity })),
          })),
        }),
      });
      setPlacedOrder(order);
      setCart([]);
      setCustomer("");
      await loadCatalog();
    } catch (err) {
      const message = err.message;
      await loadCatalog();
      setError(message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const startNewOrder = () => {
    setPlacedOrder(null);
    setSearch("");
    setCategory("All items");
    setError("");
  };

  return (
    <section className="mx-auto max-w-[1600px] space-y-6 text-[#0A3B3D] dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0A8B8E]">Branch point of sale</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">New order</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Build a customized order, review the total, and save it as pending payment.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#0A8B8E]/15 bg-[#0A8B8E]/5 px-3.5 py-2.5 text-sm font-medium text-[#0A6B6E] dark:text-teal-300">
          <Store size={17} /> {branchName || "Your branch"}
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(370px,0.8fr)]">
        <section className="min-w-0 space-y-4">
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-lg font-semibold">Menu</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose an available item to customize it.</p></div>
              <button type="button" onClick={loadCatalog} disabled={loading} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-[#0A8B8E] disabled:opacity-50 dark:text-gray-300 dark:hover:bg-neutral-800"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
            <label className="relative mt-4 block">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputClass} pl-10`} aria-label="Search menu" placeholder="Search items or categories" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Menu categories">
              {categories.map((entry) => <button key={entry} type="button" onClick={() => setCategory(entry)} className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${category === entry ? "bg-[#0A8B8E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"}`}>{entry}</button>)}
            </div>
          </div>

          {loading ? (
            <div className={`${cardClass} flex min-h-52 items-center justify-center gap-3 p-8 text-sm text-gray-500`}><RefreshCw size={18} className="animate-spin text-[#0A8B8E]" /> Loading menu…</div>
          ) : !menuItems.length ? (
            <div className={`${cardClass} px-6 py-14 text-center`}><UtensilsCrossed className="mx-auto text-gray-400" size={26} /><h3 className="mt-3 font-semibold">Menu is empty</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Menu items added by an administrator will appear here.</p></div>
          ) : !filteredItems.length ? (
            <div className={`${cardClass} px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400`}>No items match this search or category.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredItems.map((item) => <ItemCard key={item._id} item={item} stockQuantity={stockByItemId[item._id] || 0} onChoose={openCustomizer} />)}
            </div>
          )}
        </section>

        <aside className={`${cardClass} overflow-hidden xl:sticky xl:top-5`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-[#0A8B8E]/10 p-2.5 text-[#0A8B8E]"><ShoppingCart size={19} /></span><div><h3 className="font-semibold">Current order</h3><p className="text-xs text-gray-500 dark:text-gray-400">{cartQuantity} item{cartQuantity === 1 ? "" : "s"}</p></div></div>
            {cart.length > 0 && <button type="button" onClick={() => setCart([])} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">Clear</button>}
          </div>

          {cart.length ? (
            <>
              <div className="max-h-[min(45vh,460px)] divide-y divide-gray-100 overflow-y-auto px-5 dark:divide-neutral-800">
                {cart.map((item) => (
                  <article key={item.key} className="py-4">
                    <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h4 className="truncate text-sm font-semibold">{item.name}</h4><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{[item.variant?.name, ...item.addons.map((addon) => addon.name), ...(item.portionAddons || []).map((addon) => `${addon.quantity} × ${addon.name}`)].filter(Boolean).join(" · ") || "Regular"}</p><p className="mt-2 text-xs text-gray-500">{money(item.unitPrice)} each</p></div>
                      <button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Remove ${item.name}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 size={16} /></button>
                    </div>
                    <div className="mt-3 flex items-center justify-between"><QuantityControl quantity={item.quantity} maxQuantity={Math.max(1, (stockByItemId[item.menuItemId] || 0) - cart.filter((entry) => entry.menuItemId === item.menuItemId && entry.key !== item.key).reduce((sum, entry) => sum + entry.quantity, 0))} onChange={(quantity) => updateCartQuantity(item.key, quantity)} label={`Quantity for ${item.name}`} /><span className="text-sm font-semibold">{money(item.unitPrice * item.quantity)}</span></div>
                  </article>
                ))}
              </div>

              <form onSubmit={placeOrder} className="space-y-4 border-t border-gray-100 p-5 dark:border-neutral-800">
                <label className="block space-y-1.5 text-sm font-medium">Customer name or identifier <span className="font-normal text-gray-500">(optional)</span><input className={inputClass} value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Leave blank for walk-in" maxLength={120} /></label>
                <label className="block space-y-1.5 text-sm font-medium">Sales channel<select className={inputClass} required value={channel} onChange={(event) => setChannel(event.target.value)}><option value="" disabled>Select a channel</option>{channels.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}</select></label>
                {!channels.length && <p className="text-xs text-amber-700 dark:text-amber-300">No sales channels are enabled for this system.</p>}
                <div className="space-y-2 border-t border-gray-100 pt-3 text-sm dark:border-neutral-800"><div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-base font-semibold"><span>Total due</span><span>{money(subtotal)}</span></div></div>
                <button type="submit" disabled={placingOrder || !cart.length || !channels.length} className={`${primaryButtonClass} w-full py-3`}>
                  {placingOrder ? "Placing order…" : <>Place order <ArrowRight size={17} /></>}
                </button>
                <p className="text-center text-xs leading-5 text-gray-500 dark:text-gray-400">Payment confirmation will be handled from the Order Queue.</p>
              </form>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-neutral-800"><ShoppingCart size={23} /></span>
              <h4 className="mt-4 font-semibold">Your order is empty</h4>
              <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">Choose a menu item to start building this order.</p>
            </div>
          )}
        </aside>
      </div>

      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomizingItem(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customize-item-title" className={`${cardClass} max-h-[90vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[#0A8B8E]">Customize item</p><h3 id="customize-item-title" className="mt-1 text-xl font-semibold">{customizingItem.name}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{customizingItem.description || customizingItem.category}</p></div><button type="button" onClick={() => setCustomizingItem(null)} aria-label="Close customization" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"><X size={19} /></button></div>
            <form onSubmit={addCustomizedItem} className="mt-6 space-y-6">
              {availableVariants.length > 0 && <fieldset><legend className="text-sm font-semibold">Choose a variant <span className="text-red-600">*</span></legend><div className="mt-3 space-y-2">{availableVariants.map((variant) => <label key={variant._id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${selectedVariantId === variant._id ? "border-[#0A8B8E] bg-[#0A8B8E]/5" : "border-gray-200 hover:border-gray-300 dark:border-neutral-700 dark:hover:border-neutral-600"}`}><span className="flex items-center gap-3"><input type="radio" name="variant" value={variant._id} checked={selectedVariantId === variant._id} onChange={() => setSelectedVariantId(variant._id)} className="h-4 w-4 accent-[#0A8B8E]" /><span className="font-medium">{variant.name}</span></span><span className="text-sm font-semibold">+ {money(variant.price)}</span></label>)}</div></fieldset>}
              {availableAddons.length > 0 && <fieldset><legend className="text-sm font-semibold">Add-ons <span className="font-normal text-gray-500">(optional)</span></legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{availableAddons.map((addon) => <label key={addon._id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition ${selectedAddonIds.includes(addon._id) ? "border-[#0A8B8E] bg-[#0A8B8E]/5" : "border-gray-200 hover:border-gray-300 dark:border-neutral-700 dark:hover:border-neutral-600"}`}><span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selectedAddonIds.includes(addon._id)} onChange={(event) => setSelectedAddonIds((current) => event.target.checked ? [...current, addon._id] : current.filter((id) => id !== addon._id))} className="h-4 w-4 accent-[#0A8B8E]" /><span className="truncate text-sm font-medium">{addon.name}</span></span><span className="shrink-0 text-xs font-semibold text-gray-600 dark:text-gray-300">+ {money(addon.price)}</span></label>)}</div></fieldset>}
              {availablePortionItems.length > 0 && <fieldset className="space-y-4"><div><legend className="text-sm font-semibold">Choose sauces, fruits & toppings</legend><p className="mt-1 text-xs text-gray-500">One portion is one add. Included choices are free; extra portions use the listed price.</p></div>{["Fruits", "Toppings", "Sauces"].map((portionCategory) => {
                const choices = availablePortionItems.filter((entry) => entry.category === portionCategory);
                if (!choices.length) return null;
                const included = getIncludedPortions(customizingItem, portionCategory);
                return <div key={portionCategory} className="rounded-xl border border-gray-200 p-3 dark:border-neutral-700"><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">{portionCategory}</h4>{included > 0 && <span className="rounded-full bg-[#0A8B8E]/10 px-2 py-1 text-xs font-medium text-[#0A6B6E] dark:text-teal-300">{included} included</span>}</div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{choices.map((choice) => {
                  const stock = remainingPortionStock(choice._id);
                  const quantity = Number(selectedPortions[choice._id] || 0);
                  return <div key={choice._id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{choice.name}</p><p className="text-xs text-gray-500">{money(choice.price)} per add · {stock} in stock</p></div><div className="flex items-center gap-2"><button type="button" disabled={!quantity} onClick={() => setSelectedPortions((current) => ({ ...current, [choice._id]: Math.max(0, Number(current[choice._id] || 0) - 1) }))} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 disabled:opacity-40 dark:border-neutral-700"><Minus size={13} /></button><span className="min-w-5 text-center text-sm font-semibold">{quantity}</span><button type="button" disabled={quantity * customQuantity >= stock || quantity >= 99} onClick={() => setSelectedPortions((current) => ({ ...current, [choice._id]: Number(current[choice._id] || 0) + 1 }))} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 disabled:opacity-40 dark:border-neutral-700"><Plus size={13} /></button></div></div>;
                })}</div></div>;
              })}</fieldset>}
              {!availableVariants.length && !availableAddons.length && !availablePortionItems.length && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-neutral-950 dark:text-gray-400">This item has no variants or add-ons. You can add it as is.</p>}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-neutral-800"><div><p className="text-xs text-gray-500">Price per item</p><p className="mt-1 text-lg font-semibold">{money(customizationPrice)}</p></div><div className="flex items-center gap-3"><span className="text-sm font-medium">Quantity</span><QuantityControl quantity={customQuantity} maxQuantity={Math.max(1, Math.min(99, remainingCustomizingStock))} onChange={(quantity) => setCustomQuantity(Math.max(1, Math.min(99, remainingCustomizingStock, quantity)))} label="Item quantity" /></div></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setCustomizingItem(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-700">Cancel</button><button type="submit" disabled={availableVariants.length > 0 && !selectedVariantId} className={primaryButtonClass}><Plus size={17} /> Add · {money(customizationPrice * customQuantity)}</button></div>
            </form>
          </section>
        </div>
      )}

      {placedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="order-placed-title" className={`${cardClass} w-full max-w-md p-6 text-center sm:p-8`}>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 size={31} /></span>
            <p className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Saved as pending payment</p>
            <h3 id="order-placed-title" className="mt-1 text-2xl font-semibold">Order placed</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Payment confirmation will be handled from the Order Queue.</p>
            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-4 dark:bg-neutral-950"><p className="text-xs uppercase tracking-wide text-gray-500">Order number</p><p className="mt-1 text-xl font-bold tracking-wide">{placedOrder.orderNumber}</p><p className="mt-2 text-sm text-gray-500">{money(placedOrder.total)} · {placedOrder.items?.length || 0} line item{placedOrder.items?.length === 1 ? "" : "s"}</p></div>
            <button type="button" onClick={startNewOrder} className={`${primaryButtonClass} mt-6 w-full`}>Start another order <ArrowRight size={17} /></button>
          </section>
        </div>
      )}
    </section>
  );
}
