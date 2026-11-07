import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { BarChart3, CircleAlert, FileDown, FileSpreadsheet, Plus, RefreshCw, Save, ShoppingBag, Trash2, TrendingUp } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { FadeIn, Skeleton, StreakBar } from "../components/loading.jsx";
import { fadeTransition, riseIn, staggerContainer } from "../components/loadingVariants.js";
import { useToast } from "../hooks/UseToast.jsx";

const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0A8B8E] focus:ring-2 focus:ring-[#0A8B8E]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08777a] disabled:cursor-not-allowed disabled:opacity-50";

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function dateKeyForOrder(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(value));
}

function getIncluded(item, category) {
  if (category === "Fruits") return Number(item.includedFruitPortions || 0);
  if (category === "Toppings") return Number(item.includedToppingPortions || 0);
  if (category === "Sauces") return Number(item.includedSaucePortions || 0);
  return 0;
}

function selectionPrice(item, variantId, addonIds, portionChoices, menuItems) {
  const variant = item?.variants?.find((entry) => entry._id === variantId);
  let total = Number(item?.price || 0) + Number(variant?.price || 0);
  const grouped = new Map();
  Object.entries(portionChoices).forEach(([id, quantity]) => {
    const addon = menuItems.find((entry) => entry._id === id);
    const count = Number(quantity || 0);
    if (!addon || count < 1) return;
    grouped.set(addon.category, [...(grouped.get(addon.category) || []), { addon, count }]);
  });
  for (const [category, entries] of grouped) {
    let free = getIncluded(item, category);
    for (const { addon, count } of entries) {
      const included = Math.min(free, count);
      free -= included;
      total += Number(addon.price || 0) * (count - included);
    }
  }
  total += (item?.addons || []).filter((addon) => addonIds.includes(addon._id)).reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  return total;
}

function makeAnalytics(sales, onlineOrders) {
  const days = new Map();
  const items = new Map();
  const branches = new Map();
  const channels = new Map();
  const payments = new Map();
  const addRecord = (record, source, date) => {
    const entry = days.get(date) || { date, staffRevenue: 0, onlineRevenue: 0, staffCount: 0, onlineCount: 0 };
    const revenueKey = source === "staff" ? "staffRevenue" : "onlineRevenue";
    const countKey = source === "staff" ? "staffCount" : "onlineCount";
    entry[revenueKey] += Number(record.total || 0);
    entry[countKey] += 1;
    days.set(date, entry);
    const branchName = record.branchId?.name || "Unknown branch";
    const branch = branches.get(branchName) || { name: branchName, revenue: 0, sales: 0 };
    branch.revenue += Number(record.total || 0);
    branch.sales += 1;
    branches.set(branchName, branch);
    for (const item of record.items || []) {
      const itemName = item.variant?.name ? `${item.name} · ${item.variant.name}` : item.name;
      const summary = items.get(itemName) || { name: itemName, quantity: 0, revenue: 0 };
      summary.quantity += Number(item.quantity || 0);
      summary.revenue += Number(item.lineTotal || 0);
      items.set(itemName, summary);
    }
    if (source === "online") {
      const channelName = record.channel || "Unspecified";
      const channel = channels.get(channelName) || { name: channelName, revenue: 0, sales: 0 };
      channel.revenue += Number(record.total || 0);
      channel.sales += 1;
      channels.set(channelName, channel);
    }
    const paymentName = record.paymentMethod || "Unspecified";
    const payment = payments.get(paymentName) || { name: paymentName, revenue: 0, sales: 0 };
    payment.revenue += Number(record.total || 0);
    payment.sales += 1;
    payments.set(paymentName, payment);
  };
  sales.forEach((sale) => addRecord(sale, "staff", sale.businessDate));
  onlineOrders.forEach((order) => addRecord(order, "online", dateKeyForOrder(order.updatedAt)));
  return {
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    items: [...items.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    branches: [...branches.values()].sort((a, b) => b.revenue - a.revenue),
    channels: [...channels.values()].sort((a, b) => b.revenue - a.revenue),
    payments: [...payments.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

function makeExportRows(sales, onlineOrders) {
  return [
    ["Source", "Transaction", "Branch", "Business date", "Channel", "Payment method", "Items", "Quantity", "Revenue"],
    ...sales.map((sale) => ["Staff sale", sale.saleNumber, sale.branchId?.name || "", sale.businessDate, "", sale.paymentMethod || "", sale.items.map((item) => `${item.name}${item.variant?.name ? ` (${item.variant.name})` : ""}${item.addons?.length ? ` [${item.addons.map((addon) => `${addon.quantity || 1}x ${addon.name}`).join(", ")}]` : ""}`).join("; "), sale.items.reduce((sum, item) => sum + item.quantity, 0), sale.total]),
    ...onlineOrders.map((order) => ["Online order", order.orderNumber, order.branchId?.name || "", dateKeyForOrder(order.updatedAt), order.channel, order.paymentMethod, order.items.map((item) => `${item.name}${item.variant?.name ? ` (${item.variant.name})` : ""}${item.addons?.length ? ` [${item.addons.map((addon) => `${addon.quantity || 1}x ${addon.name}`).join(", ")}]` : ""}`).join("; "), order.items.reduce((sum, item) => sum + item.quantity, 0), order.total]),
  ];
}

function Metric({ label, value, icon: Icon, detail }) {
  return <motion.article variants={riseIn} className={`${cardClass} flex items-center gap-4 p-5`}><span className="rounded-xl bg-[#0A8B8E]/10 p-3 text-[#0A8B8E]"><Icon size={20} /></span><div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p>{detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}</div></motion.article>;
}

function makeChartBuckets(data, from, to, leftKey, rightKey) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const dayCount = Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
  const interval = Math.max(1, Math.ceil(dayCount / 31));
  const bucketCount = Math.ceil(dayCount / interval);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index * interval);
    return { date: date.toISOString().slice(0, 10), [leftKey]: 0, [rightKey]: 0 };
  });
  for (const entry of data) {
    const date = new Date(`${entry.date}T00:00:00Z`);
    const index = Math.floor((date - start) / 86_400_000 / interval);
    if (buckets[index]) {
      buckets[index][leftKey] += Number(entry[leftKey] || 0);
      buckets[index][rightKey] += Number(entry[rightKey] || 0);
    }
  }
  return buckets;
}

function TrendChart({ title, data, leftKey, rightKey, from, to, currency = false }) {
  const chartData = makeChartBuckets(data, from, to, leftKey, rightKey);
  const hasSales = data.some((entry) => entry[leftKey] > 0 || entry[rightKey] > 0);
  const max = Math.max(1, ...chartData.map((entry) => entry[leftKey] + entry[rightKey]));
  return <section className={`${cardClass} p-5`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Staff-entered sales and completed online orders</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#0A8B8E]" />Staff sales</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#F2C879]" />Online orders</span></div></div>
    {!hasSales && <p className="mt-4 text-xs text-gray-500">No sales recorded in this date range. Showing zero activity.</p>}
    <div className="mt-4 flex h-56 items-end gap-2 overflow-x-auto border-b border-gray-200 pb-2 dark:border-neutral-700">
      {chartData.map((entry) => {
        const total = entry[leftKey] + entry[rightKey];
        const firstHeight = Math.max(0, (entry[leftKey] / max) * 100);
        const secondHeight = Math.max(0, (entry[rightKey] / max) * 100);
        return <div key={entry.date} title={`${entry.date}: ${currency ? money(total) : total}`} className="flex h-full min-w-10 flex-1 flex-col justify-end">
          <div className="flex h-full items-end justify-center gap-1">
            <div className="w-3 rounded-t bg-[#0A8B8E]" style={{ height: firstHeight ? `${firstHeight}%` : "2px" }} />
            <div className="w-3 rounded-t bg-[#F2C879]" style={{ height: secondHeight ? `${secondHeight}%` : "2px" }} />
          </div>
          <span className="mt-2 truncate text-center text-[10px] text-gray-500">{entry.date.slice(5)}</span>
        </div>;
      })}
    </div>
  </section>;
}

export default function ReportsPage() {
  const toast = useToast();
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "null"); } catch { return null; }
  }, []);
  const isAdmin = user?.role === "admin";
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [sales, setSales] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stockByItemId, setStockByItemId] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [itemId, setItemId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [addonIds, setAddonIds] = useState([]);
  const [portionChoices, setPortionChoices] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [exportingSheet, setExportingSheet] = useState(false);
  const [connectingSheets, setConnectingSheets] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [googleSheetsEnabled, setGoogleSheetsEnabled] = useState(false);
  const [exportSettingsLoaded, setExportSettingsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedItem = menuItems.find((item) => item._id === itemId);
  const activeProducts = menuItems.filter((item) => item.itemType !== "addon" && item.active && !item.archived);
  const portionItems = menuItems.filter((item) => item.itemType === "addon" && item.active && !item.archived);
  const availableVariants = selectedItem?.variants?.filter((entry) => entry.active) || [];
  const analytics = useMemo(() => makeAnalytics(sales, onlineOrders), [sales, onlineOrders]);
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) + onlineOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageSale = sales.length + onlineOrders.length ? totalRevenue / (sales.length + onlineOrders.length) : 0;
  const recordCount = sales.length + onlineOrders.length;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (isAdmin && branchId) params.set("branchId", branchId);
      const report = await apiRequest(`/api/reports?${params.toString()}`);
      setSales(report.sales || []);
      setOnlineOrders(report.onlineOrders || []);
      if (isAdmin) setBranches(report.branches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setReportLoaded(true);
    }
  }, [from, to, isAdmin, branchId]);

  const loadCatalog = useCallback(async () => {
    if (isAdmin) {
      setCatalogLoaded(true);
      return;
    }
    try {
      const [items, inventory, config] = await Promise.all([
        apiRequest("/api/menu"),
        apiRequest("/api/inventory"),
        apiRequest("/api/store-config"),
      ]);
      setMenuItems(items);
      setStockByItemId(Object.fromEntries(inventory.map((entry) => [entry.menuItemId?._id, entry.quantity])));
      const activePaymentMethods = (config.paymentMethods || []).filter((entry) => entry.active);
      setPaymentMethods(activePaymentMethods);
      setPaymentMethod((current) => activePaymentMethods.some((entry) => entry.key === current)
        ? current
        : activePaymentMethods[0]?.key || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setCatalogLoaded(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadReports(); });
    return () => { active = false; };
  }, [loadReports]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadCatalog(); });
    return () => { active = false; };
  }, [loadCatalog]);
  useEffect(() => {
    let active = true;
    apiRequest("/api/auth-settings")
      .then((config) => {
        if (!active) return;
        setPdfEnabled(config.pdfEnabled !== false);
        setGoogleSheetsEnabled(config.googleSheetsEnabled !== false);
      })
      .catch((err) => setError(err.message))
      .finally(() => { if (active) setExportSettingsLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const callbackStatus = new URLSearchParams(window.location.search).get("sheet");
    if (callbackStatus) {
      if (callbackStatus === "connected") toast.success("Google Sheets connected.");
      if (callbackStatus === "connect_failed") toast.error("Unable to connect Google Sheets. Please try again.");
      if (callbackStatus === "connect_cancelled") toast.error("Google Sheets connection was cancelled.");
      if (callbackStatus === "disabled") toast.error("Google Sheets is disabled by an administrator.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    apiRequest("/api/sheets/status")
      .then((status) => { if (active) setSheetsStatus(status); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [toast]);

  const chooseProduct = (nextId) => {
    setItemId(nextId);
    setVariantId("");
    setAddonIds([]);
    setPortionChoices({});
  };

  const addItem = (event) => {
    event.preventDefault();
    if (!selectedItem) return setError("Choose a menu item first.");
    if (availableVariants.length && !variantId) return setError(`Choose a size or flavor for ${selectedItem.name}.`);
    for (const [category, field] of [["Fruits", "includedFruitPortions"], ["Toppings", "includedToppingPortions"], ["Sauces", "includedSaucePortions"]]) {
      const required = Number(selectedItem[field] || 0);
      const chosen = Object.entries(portionChoices).reduce((sum, [id, value]) => {
        const addon = portionItems.find((entry) => entry._id === id);
        return sum + (addon?.category === category ? Number(value || 0) : 0);
      }, 0);
      if (chosen < required) return setError(`Choose at least ${required} ${category.toLowerCase()} portion${required === 1 ? "" : "s"}.`);
    }
    const menuQuantity = Number(quantity);
    if (!Number.isInteger(menuQuantity) || menuQuantity < 1 || menuQuantity > 99) return setError("Enter a quantity from 1 to 99.");
    const itemStock = Number(stockByItemId[selectedItem._id] || 0);
    const cartMainQuantity = cart.filter((entry) => entry.menuItemId === selectedItem._id).reduce((sum, entry) => sum + entry.quantity, 0);
    if (menuQuantity + cartMainQuantity > itemStock) return setError(`Only ${Math.max(0, itemStock - cartMainQuantity)} ${selectedItem.name} in stock.`);
    for (const [id, value] of Object.entries(portionChoices)) {
      const requested = Number(value || 0) * menuQuantity;
      const inCart = cart.reduce((sum, entry) => sum + Number(entry.portionChoices[id] || 0) * entry.quantity, 0);
      if (requested + inCart > Number(stockByItemId[id] || 0)) return setError(`There is not enough ${portionItems.find((entry) => entry._id === id)?.name || "add-on"} stock.`);
    }
    const key = [selectedItem._id, variantId, ...addonIds.sort(), ...Object.entries(portionChoices).sort().flat()].join(":");
    const variant = availableVariants.find((entry) => entry._id === variantId);
    const line = {
      key, menuItemId: selectedItem._id, name: selectedItem.name, category: selectedItem.category,
      variantId, variantName: variant?.name || "", addonIds: [...addonIds],
      addonNames: (selectedItem.addons || []).filter((entry) => addonIds.includes(entry._id)).map((entry) => entry.name),
      portionChoices: { ...portionChoices },
      portionNames: Object.entries(portionChoices).filter(([, count]) => Number(count) > 0).map(([id, count]) => ({ name: portionItems.find((entry) => entry._id === id)?.name, count: Number(count) })).filter((entry) => entry.name),
      quantity: menuQuantity,
      unitPrice: selectionPrice(selectedItem, variantId, addonIds, portionChoices, portionItems),
    };
    setCart((current) => {
      const match = current.find((entry) => entry.key === key);
      return match ? current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + menuQuantity } : entry) : [...current, line];
    });
    setError("");
  };

  const submitSale = async () => {
    if (!cart.length) return setError("Add at least one item to the sale.");
    if (!paymentMethod) return setError("Choose a payment method for this sale.");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/reports/sales", {
        method: "POST",
        body: JSON.stringify({
          businessDate: from,
          paymentMethod,
          items: cart.map((entry) => ({
            menuItemId: entry.menuItemId, quantity: entry.quantity, variantId: entry.variantId,
            addonIds: entry.addonIds,
            addonSelections: Object.entries(entry.portionChoices).filter(([, count]) => Number(count) > 0).map(([menuItemId, count]) => ({ menuItemId, quantity: Number(count) })),
          })),
        }),
      });
      setCart([]);
      setNotice("Sale recorded and branch stock updated.");
      await Promise.all([loadReports(), loadCatalog()]);
    } catch (err) {
      setError(err.message);
      await loadCatalog();
    } finally {
      setSaving(false);
    }
  };

  const activeDays = analytics.days;
  const totalItemsSold = analytics.items.reduce((sum, item) => sum + item.quantity, 0);

  const exportPdf = async () => {
    const pdfTab = window.open("", "_blank");
    if (!pdfTab) {
      toast.error("Allow pop-ups for this site to open the PDF report.");
      return;
    }

    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const selectedBranch = branches.find((branch) => branch._id === branchId);
      const reportName = `Cremoso Sales Report - ${selectedBranch?.name || "All branches"} - ${from} to ${to}`;
      const document = new jsPDF({ orientation: "landscape" });
      document.setProperties({ title: reportName });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 12;
      const columns = [
        { title: "Source", width: 20 },
        { title: "Transaction", width: 28 },
        { title: "Branch", width: 27 },
        { title: "Date", width: 20 },
        { title: "Channel", width: 22 },
        { title: "Payment", width: 23 },
        { title: "Items", width: 103 },
        { title: "Qty", width: 12 },
        { title: "Revenue", width: 25 },
      ];
      const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
      const startX = Math.max(margin, (pageWidth - tableWidth) / 2);
      let y = 44;

      const safeText = (value) => String(value ?? "").replace(/[^\x20-\x7E]/g, " ");
      const pdfMoney = (value) => `PHP ${Number(value || 0).toFixed(2)}`;
      const drawTableHeader = () => {
        document.setFillColor(10, 139, 142);
        document.setTextColor(255, 255, 255);
        document.setFontSize(7);
        document.setFont("helvetica", "bold");
        let x = startX;
        for (const column of columns) {
          document.rect(x, y, column.width, 8, "F");
          document.text(column.title, x + 1.5, y + 5.3);
          x += column.width;
        }
        document.setTextColor(20, 40, 40);
        document.setFont("helvetica", "normal");
        y += 8;
      };

      document.setFont("helvetica", "bold");
      document.setFontSize(17);
      document.text("Cremoso Sales Report", margin, 16);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      document.text(`Branch: ${safeText(selectedBranch?.name || "All branches")}`, margin, 23);
      document.text(`Period: ${from} to ${to}`, margin, 29);
      document.text(`Revenue: ${pdfMoney(totalRevenue)}    Transactions: ${recordCount}`, margin, 35);
      drawTableHeader();

      const exportRows = makeExportRows(sales, onlineOrders).slice(1);
      const reportRows = exportRows.length
        ? exportRows.map((row) => [...row.slice(0, 8), pdfMoney(row[8])])
        : [["", "", "", "", "", "", "No transactions in this date range.", "", ""]];

      for (let index = 0; index < reportRows.length; index += 1) {
        const values = reportRows[index].map(safeText);
        const cellLines = values.map((value, cellIndex) => document.splitTextToSize(
          value,
          columns[cellIndex].width - 3,
        ));
        const rowHeight = Math.max(7, ...cellLines.map((lines) => lines.length * 3.5 + 3));
        if (y + rowHeight > pageHeight - margin) {
          document.addPage();
          y = margin;
          drawTableHeader();
        }

        document.setFillColor(index % 2 ? 248 : 255, index % 2 ? 250 : 255, index % 2 ? 250 : 255);
        let x = startX;
        for (let cellIndex = 0; cellIndex < columns.length; cellIndex += 1) {
          const column = columns[cellIndex];
          document.rect(x, y, column.width, rowHeight, "FD");
          document.text(cellLines[cellIndex], x + 1.5, y + 4.5);
          x += column.width;
        }
        y += rowHeight;
      }

      pdfTab.opener = null;
      const pdfUrl = URL.createObjectURL(document.output("blob"));
      pdfTab.location.replace(pdfUrl);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error) {
      pdfTab.close();
      console.error("Sales report PDF export error:", error);
      toast.error("Unable to generate the PDF report.");
    } finally {
      setExportingPdf(false);
    }
  };

  const exportGoogleSheet = async () => {
    setExportingSheet(true);
    try {
      const selectedBranch = branches.find((branch) => branch._id === branchId);
      const reportName = `Cremoso Sales Report - ${selectedBranch?.name || "All branches"} - ${from} to ${to}`;
      const result = await apiRequest("/api/sheets/export", {
        method: "POST",
        body: JSON.stringify({
          title: reportName,
          rows: makeExportRows(sales, onlineOrders),
        }),
      });
      toast.success(
        <span>
          Google Sheet created.{" "}
          <a
            href={result.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0A8B8E] underline"
          >
            Open sheet
          </a>
        </span>,
        10000,
      );
    } catch (err) {
      const message = err.message.toLowerCase().includes("sheets")
        && (err.message.toLowerCase().includes("not connected")
          || err.message.toLowerCase().includes("reconnect"))
        ? "Connect Google Sheets before exporting."
        : err.message;
      toast.error(message);
      setError(message);
    } finally {
      setExportingSheet(false);
    }
  };

  const connectGoogleSheets = async () => {
    setConnectingSheets(true);
    try {
      const { url } = await apiRequest("/api/sheets/connect");
      window.location.assign(url);
    } catch (err) {
      toast.error(err.message);
      setConnectingSheets(false);
    }
  };

  const initialLoading = !reportLoaded || !catalogLoaded;
  return <MotionConfig reducedMotion="user"><section className="mx-auto max-w-375 space-y-6 text-[#0A3B3D] dark:text-white">
    {initialLoading && <p role="status" className="sr-only">Loading reports...</p>}
    <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition} className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[#0A8B8E]">{isAdmin ? "Company performance" : "Branch sales"}</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Track revenue and sales from staff entries and completed online orders.</p></div><div className="flex gap-2">{isAdmin && <><button type="button" onClick={exportPdf} disabled={loading || exportingPdf || !exportSettingsLoaded || !pdfEnabled} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><FileDown size={16} /> {exportingPdf ? "Generating PDF..." : "Export PDF"}</button>{sheetsStatus?.enabled && (sheetsStatus.connected ? <button type="button" onClick={exportGoogleSheet} disabled={loading || exportingSheet || !exportSettingsLoaded || !googleSheetsEnabled} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><FileSpreadsheet size={16} /> {exportingSheet ? "Exporting..." : "Export to Google Sheets"}</button> : <button type="button" onClick={connectGoogleSheets} disabled={connectingSheets || !sheetsStatus} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><FileSpreadsheet size={16} /> {connectingSheets ? "Connecting..." : "Connect Google Sheets"}</button>)}</> }<button type="button" onClick={loadReports} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button></div></motion.header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

    {initialLoading ? <div className="space-y-5"><div className={`${cardClass} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4`}>{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <div key={index} className={`${cardClass} flex gap-4 p-5`}><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-32" /><Skeleton className="h-3 w-36" /></div></div>)}</div><div className="grid gap-5 xl:grid-cols-2">{[0, 1].map((index) => <div key={index} className={`${cardClass} p-5`}><Skeleton className="h-5 w-40" /><Skeleton className="mt-2 h-4 w-64" /><Skeleton className="mt-5 h-56 w-full" /></div>)}</div><div className="grid gap-5 xl:grid-cols-2">{[0, 1].map((index) => <div key={index} className={`${cardClass} space-y-4 p-5`}><Skeleton className="h-6 w-40" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-32" /></div>)}</div></div> : <>
    <section className={`${cardClass} p-4`} aria-label="Report filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {isAdmin && <label className="text-xs font-medium text-gray-500">Branch<select className={`${inputClass} mt-1`} value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">All branches</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>}
      <label className="text-xs font-medium text-gray-500">From date<input className={`${inputClass} mt-1`} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="text-xs font-medium text-gray-500">To date<input className={`${inputClass} mt-1`} type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
      {!isAdmin && <p className="self-end pb-2 text-xs text-gray-500 dark:text-gray-400">Sales can be entered at closing using their actual date.</p>}
    </div></section>

    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Revenue" value={money(totalRevenue)} icon={TrendingUp} detail="Staff sales + completed online orders" />
      <Metric label="Total sales" value={recordCount.toLocaleString()} icon={ShoppingBag} detail={`${sales.length} staff · ${onlineOrders.length} online`} />
      <Metric label="Average sale" value={money(averageSale)} icon={BarChart3} detail="Revenue divided by completed sales" />
      <Metric label="Items sold" value={totalItemsSold.toLocaleString()} icon={Plus} detail="Across both sales sources" />
    </motion.div>

    <div className="grid gap-5 xl:grid-cols-2">
      <FadeIn from="left" delay={0.15}><TrendChart title="Revenue by day" data={activeDays} leftKey="staffRevenue" rightKey="onlineRevenue" from={from} to={to} currency /></FadeIn>
      <FadeIn from="right" delay={0.15}><TrendChart title="Sales count by day" data={activeDays} leftKey="staffCount" rightKey="onlineCount" from={from} to={to} /></FadeIn>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><h3 className="font-semibold">Best-selling items</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">By recorded quantity in the selected period</p></div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{analytics.items.length ? analytics.items.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 text-xs text-gray-500">{item.quantity} sold</p></div><span className="shrink-0 text-sm font-semibold">{money(item.revenue)}</span></div>) : <p className="p-8 text-center text-sm text-gray-500">No item sales in this date range.</p>}</div></section>
      {isAdmin ? <section className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><h3 className="font-semibold">Branch performance</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Revenue and sales in the selected period</p></div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{analytics.branches.length ? analytics.branches.map((branch) => <div key={branch.name} className="flex items-center justify-between gap-4 px-5 py-3"><div><p className="font-medium">{branch.name}</p><p className="mt-0.5 text-xs text-gray-500">{branch.sales} sales</p></div><span className="font-semibold">{money(branch.revenue)}</span></div>) : <p className="p-8 text-center text-sm text-gray-500">No branch sales in this date range.</p>}</div></section> : <section className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><h3 className="font-semibold">Recent recorded sales</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Staff entries use the selected business date.</p></div><div className="max-h-90 divide-y divide-gray-100 overflow-y-auto dark:divide-neutral-800">{sales.length ? sales.slice(0, 40).map((sale) => <div key={sale._id} className="flex items-center justify-between gap-4 px-5 py-3"><div><p className="text-sm font-medium">{sale.saleNumber}</p><p className="mt-0.5 text-xs text-gray-500">{sale.businessDate} · {sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></div><span className="font-semibold">{money(sale.total)}</span></div>) : <p className="p-8 text-center text-sm text-gray-500">No staff-entered sales in this date range.</p>}</div></section>}
    </div>

    {isAdmin && <div className="grid gap-5 xl:grid-cols-2"><section className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><h3 className="font-semibold">Online sales channels</h3><p className="mt-1 text-xs text-gray-500">Channel totals for completed online orders</p></div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{analytics.channels.length ? analytics.channels.map((entry) => <div key={entry.name} className="flex items-center justify-between px-5 py-3"><div><p className="font-medium">{entry.name}</p><p className="text-xs text-gray-500">{entry.sales} orders</p></div><span className="font-semibold">{money(entry.revenue)}</span></div>) : <p className="p-8 text-center text-sm text-gray-500">No completed online orders in this date range.</p>}</div></section><section className={`${cardClass} overflow-hidden`}><div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800"><h3 className="font-semibold">Payment methods</h3><p className="mt-1 text-xs text-gray-500">Staff-entered sales and completed online orders</p></div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{analytics.payments.length ? analytics.payments.map((entry) => <div key={entry.name} className="flex items-center justify-between px-5 py-3"><div><p className="font-medium">{entry.name}</p><p className="text-xs text-gray-500">{entry.sales} transactions</p></div><span className="font-semibold">{money(entry.revenue)}</span></div>) : <p className="p-8 text-center text-sm text-gray-500">No payments in this date range.</p>}</div></section></div>}

    {!isAdmin && <section className={`${cardClass} p-5`}>
      <div className="mb-4"><h3 className="font-semibold">Log a sale</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter a sale now or at closing, choose the date it happened, and the catalog calculates prices.</p></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-500">Sale date<input className={`${inputClass} mt-1`} type="date" max={todayKey()} value={from} onChange={(event) => { setFrom(event.target.value); setTo(event.target.value); }} /></label><div className="self-end pb-2 text-xs text-gray-500">When entering at closing, select the day the customer bought the items.</div></div>
      <form onSubmit={addItem} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-gray-500">Payment method<select required className={`${inputClass} mt-1`} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="">{paymentMethods.length ? "Choose payment method" : "No active payment methods"}</option>{paymentMethods.map((method) => <option key={method.key} value={method.key}>{method.name}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-500 md:col-span-2">Menu item<select required className={`${inputClass} mt-1`} value={itemId} onChange={(event) => chooseProduct(event.target.value)}><option value="">Choose an item</option>{activeProducts.map((item) => <option key={item._id} value={item._id}>{item.name} · {money(item.price)}</option>)}</select></label>
        {availableVariants.length > 0 && <label className="text-xs font-medium text-gray-500">Size / flavor<select required className={`${inputClass} mt-1`} value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">Choose option</option>{availableVariants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name} · {money(variant.price)}</option>)}</select></label>}
        <label className="text-xs font-medium text-gray-500">Quantity<input className={`${inputClass} mt-1`} type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        {selectedItem?.addons?.some((addon) => addon.active) && <fieldset className="rounded-xl border border-gray-200 p-3 dark:border-neutral-700 md:col-span-2"><legend className="px-1 text-xs font-medium text-gray-500">Add-ons</legend><div className="flex flex-wrap gap-x-4 gap-y-2">{selectedItem.addons.filter((addon) => addon.active).map((addon) => <label key={addon._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addonIds.includes(addon._id)} onChange={(event) => setAddonIds((current) => event.target.checked ? [...current, addon._id] : current.filter((id) => id !== addon._id))} />{addon.name} (+{money(addon.price)})</label>)}</div></fieldset>}
        {selectedItem && portionItems.length > 0 && <fieldset className="rounded-xl border border-gray-200 p-3 dark:border-neutral-700 md:col-span-2 xl:col-span-4"><legend className="px-1 text-xs font-medium text-gray-500">Fruits, toppings, sauces</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{portionItems.map((addon) => <label key={addon._id} className="text-xs text-gray-500">{addon.name} · {money(addon.price)}<input className={`${inputClass} mt-1`} type="number" min="0" max="99" value={portionChoices[addon._id] || ""} onChange={(event) => setPortionChoices((current) => ({ ...current, [addon._id]: event.target.value }))} /></label>)}</div></fieldset>}
        {selectedItem && <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 xl:col-span-4"><p className="text-sm text-gray-600 dark:text-gray-300">Unit price: <strong className="text-[#0A3B3D] dark:text-white">{money(selectionPrice(selectedItem, variantId, addonIds, portionChoices, portionItems))}</strong></p><button className={buttonClass}><Plus size={16} /> Add item</button></div>}
      </form>
      {cart.length > 0 && <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-700"><div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold dark:border-neutral-800">Sale items</div><div className="divide-y divide-gray-100 dark:divide-neutral-800">{cart.map((entry) => <div key={entry.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="font-medium">{entry.quantity} × {entry.name}{entry.variantName ? ` · ${entry.variantName}` : ""}</p><p className="mt-0.5 truncate text-xs text-gray-500">{[...entry.addonNames, ...entry.portionNames.map((addon) => `${addon.count} × ${addon.name}`)].join(", ") || "No add-ons"}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{money(entry.unitPrice * entry.quantity)}</span><button type="button" aria-label={`Remove ${entry.name}`} onClick={() => setCart((current) => current.filter((item) => item.key !== entry.key))} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></div>)}</div><div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-4 py-4 dark:border-neutral-800"><div><p className="text-xs text-gray-500">Sale total</p><p className="text-xl font-semibold">{money(cart.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0))}</p></div><button type="button" onClick={submitSale} disabled={saving} className={buttonClass}><Save size={16} />{saving ? "Saving sale..." : "Save sale"}</button></div></div>}
    </section>}
    {loading && <p className="text-center text-xs text-gray-500">Updating report…</p>}
    </>}
    <AnimatePresence>{initialLoading && <StreakBar />}</AnimatePresence>
  </section></MotionConfig>;
}
