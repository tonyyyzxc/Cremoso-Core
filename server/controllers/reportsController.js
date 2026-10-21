import mongoose from "mongoose";
import { randomInt } from "node:crypto";
import Branch from "../models/branch.js";
import Inventory from "../models/inventory.js";
import MenuItem from "../models/menuItem.js";
import Order from "../models/order.js";
import Sale from "../models/sale.js";
import Supply from "../models/supply.js";
import SupplyInventory from "../models/supplyInventory.js";
import StoreConfig from "../models/storeConfig.js";

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getDayRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function dateRange(from, to) {
  const start = getDayRange(from).start;
  const end = new Date(getDayRange(to).end.getTime() - 1);
  return { start, end };
}

function createSaleNumber() {
  const date = getManilaDateKey().replaceAll("-", "");
  return `SALE-${date}-${randomInt(100000, 1000000)}`;
}

function readReportDates(query) {
  const today = getManilaDateKey();
  const from = query.from || today;
  const to = query.to || today;
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) return null;
  return { from, to, ...dateRange(from, to) };
}

async function updateStock(model, branchId, id, quantity, reserved) {
  const stock = await model.findOneAndUpdate(
    { branchId, [model === Inventory ? "menuItemId" : "supplyId"]: id, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true },
  );
  if (!stock) throw Object.assign(new Error("There is not enough branch stock to record this sale."), { statusCode: 409 });
  reserved.push({ model, id, quantity });
}

async function restoreStock(branchId, reserved) {
  await Promise.all(reserved.map(({ model, id, quantity }) => model.updateOne(
    { branchId, [model === Inventory ? "menuItemId" : "supplyId"]: id },
    { $inc: { quantity } },
  )));
}

function buildSalesFilter(req, range) {
  const filter = { businessDate: { $gte: range.from, $lte: range.to } };
  if (req.user.role === "staff") filter.branchId = req.user.branchId;
  else if (req.query.branchId && mongoose.Types.ObjectId.isValid(req.query.branchId)) filter.branchId = req.query.branchId;
  return filter;
}

function buildOrderFilter(req, range) {
  const filter = { status: "completed", updatedAt: { $gte: range.start, $lte: range.end } };
  if (req.user.role === "staff") filter.branchId = req.user.branchId;
  else if (req.query.branchId && mongoose.Types.ObjectId.isValid(req.query.branchId)) filter.branchId = req.query.branchId;
  return filter;
}

export async function createStaffSale(req, res) {
  const branchId = req.user.branchId;
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId.toString())) {
    return res.status(400).json({ error: "This staff account is not assigned to a branch." });
  }
  const businessDate = typeof req.body?.businessDate === "string" ? req.body.businessDate : "";
  const paymentKey = typeof req.body?.paymentMethod === "string" ? req.body.paymentMethod : "";
  const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!isValidDateKey(businessDate) || businessDate > getManilaDateKey()) {
    return res.status(400).json({ error: "Choose a valid sale date that is not in the future." });
  }
  if (!requestedItems.length || requestedItems.length > 50) {
    return res.status(400).json({ error: "Add between 1 and 50 items to this sale." });
  }
  if (requestedItems.some((item) => !item || typeof item !== "object")) {
    return res.status(400).json({ error: "One or more sale items are invalid." });
  }

  const reserved = [];
  try {
    const config = await StoreConfig.findOne({ key: "default" });
    const paymentMethod = (config?.paymentMethods || []).find(
      (entry) => entry.key === paymentKey && entry.active,
    );
    if (!paymentMethod) {
      return res.status(400).json({ error: "Choose an active payment method for this sale." });
    }
    const mainIds = requestedItems.map((item) => item.menuItemId);
    const selections = requestedItems.flatMap((item) => Array.isArray(item.addonSelections) ? item.addonSelections : []);
    const allIds = [...new Set([...mainIds, ...selections.map((entry) => entry?.menuItemId)])];
    if (allIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "One or more menu selections are invalid." });
    }
    const menuItems = await MenuItem.find({ _id: { $in: allIds }, branchId });
    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const supplyIds = menuItems.flatMap((item) => [
      ...item.supplyUsage.map((entry) => entry.supplyId),
      ...item.variants.flatMap((variant) => variant.supplyUsage.map((entry) => entry.supplyId)),
    ]);
    const supplies = await Supply.find({ _id: { $in: [...new Set(supplyIds.map(String))] } });
    const supplyById = new Map(supplies.map((supply) => [supply._id.toString(), supply]));
    const snapshotItems = [];
    const quantitiesByMenuItem = new Map();
    const quantitiesBySupply = new Map();

    for (const requested of requestedItems) {
      const item = menuById.get(String(requested.menuItemId));
      const quantity = Number(requested.quantity);
      if (!item || !item.active || item.archived || item.itemType === "addon") {
        return res.status(409).json({ error: "A selected menu item is unavailable. Refresh the menu and try again." });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ error: "Item quantities must be between 1 and 99." });
      }

      let variant = null;
      if (requested.variantId) {
        variant = item.variants.id(requested.variantId);
        if (!variant || !variant.active) return res.status(409).json({ error: `${item.name} has an unavailable size or flavor.` });
      } else if (item.variants.some((entry) => entry.active)) {
        return res.status(400).json({ error: `Choose a size or flavor for ${item.name}.` });
      }

      const addonIds = Array.isArray(requested.addonIds) ? requested.addonIds : [];
      if (new Set(addonIds).size !== addonIds.length) return res.status(400).json({ error: `Remove duplicate add-ons from ${item.name}.` });
      const embeddedAddons = addonIds.map((id) => item.addons.id(id));
      if (embeddedAddons.some((addon) => !addon || !addon.active)) return res.status(409).json({ error: `${item.name} has an unavailable add-on.` });

      const included = {
        fruits: Number(item.includedFruitPortions || 0),
        toppings: Number(item.includedToppingPortions || 0),
        sauces: Number(item.includedSaucePortions || 0),
      };
      const selectionsByCategory = new Map();
      const seen = new Set();
      for (const selection of Array.isArray(requested.addonSelections) ? requested.addonSelections : []) {
        const id = String(selection?.menuItemId || "");
        const addon = menuById.get(id);
        const count = Number(selection?.quantity);
        if (seen.has(id) || !addon || addon.itemType !== "addon" || !addon.active || addon.archived) {
          return res.status(409).json({ error: `Refresh the menu: ${item.name} has an invalid topping, fruit, or sauce.` });
        }
        if (!Number.isInteger(count) || count < 1 || count > 99) return res.status(400).json({ error: `Choose a valid quantity for ${addon.name}.` });
        const key = addon.category.trim().toLowerCase();
        if (!Object.hasOwn(included, key)) return res.status(400).json({ error: `${addon.name} must be categorized as Fruits, Toppings, or Sauces.` });
        seen.add(id);
        if (!selectionsByCategory.has(key)) selectionsByCategory.set(key, []);
        selectionsByCategory.get(key).push({ addon, quantity: count });
      }
      for (const [category, required] of Object.entries(included)) {
        const count = (selectionsByCategory.get(category) || []).reduce((sum, entry) => sum + entry.quantity, 0);
        if (count < required) return res.status(400).json({ error: `Choose at least ${required} ${category} portion${required === 1 ? "" : "s"} for ${item.name}.` });
      }

      const remainingIncluded = { ...included };
      const portionSnapshots = [];
      for (const entries of selectionsByCategory.values()) {
        for (const { addon, quantity: count } of entries) {
          const category = addon.category.trim().toLowerCase();
          const includedQuantity = Math.min(remainingIncluded[category], count);
          remainingIncluded[category] -= includedQuantity;
          portionSnapshots.push({ menuItemId: addon._id, name: addon.name, category: addon.category, price: addon.price, quantity: count, chargedQuantity: count - includedQuantity });
          quantitiesByMenuItem.set(addon._id.toString(), (quantitiesByMenuItem.get(addon._id.toString()) || 0) + count * quantity);
        }
      }
      const addonSnapshots = [
        ...embeddedAddons.map((addon) => ({ name: addon.name, price: addon.price })),
        ...portionSnapshots,
      ];
      const variantSnapshot = variant ? { name: variant.name, price: variant.price } : { name: "", price: 0 };
      const addonPrice = addonSnapshots.reduce((sum, addon) => sum + addon.price * (addon.chargedQuantity ?? 1), 0);
      const unitPrice = roundMoney(item.price + variantSnapshot.price + addonPrice);
      snapshotItems.push({
        menuItemId: item._id, name: item.name, category: item.category, variant: variantSnapshot,
        addons: addonSnapshots, quantity, unitPrice, lineTotal: roundMoney(unitPrice * quantity),
      });
      quantitiesByMenuItem.set(item._id.toString(), (quantitiesByMenuItem.get(item._id.toString()) || 0) + quantity);

      const usageById = new Map();
      for (const usage of [...item.supplyUsage, ...(variant?.supplyUsage || [])]) {
        const supply = supplyById.get(usage.supplyId.toString());
        if (!supply || !supply.active) return res.status(409).json({ error: `${item.name} uses a supply that is unavailable.` });
        const key = supply._id.toString();
        usageById.set(key, { supplyId: supply._id, name: supply.name, unit: supply.unit, quantity: (usageById.get(key)?.quantity || 0) + usage.quantity });
      }
      const supplyUsage = [...usageById.values()];
      snapshotItems[snapshotItems.length - 1].supplyUsage = supplyUsage;
      for (const supply of supplyUsage) quantitiesBySupply.set(supply.supplyId.toString(), (quantitiesBySupply.get(supply.supplyId.toString()) || 0) + supply.quantity * quantity);
    }

    const subtotal = roundMoney(snapshotItems.reduce((sum, item) => sum + item.lineTotal, 0));
    for (const [menuItemId, quantity] of quantitiesByMenuItem) await updateStock(Inventory, branchId, menuItemId, quantity, reserved);
    for (const [supplyId, quantity] of quantitiesBySupply) await updateStock(SupplyInventory, branchId, supplyId, quantity, reserved);
    const sale = await Sale.create({
      saleNumber: createSaleNumber(), branchId, businessDate, items: snapshotItems,
      subtotal, total: subtotal, paymentMethod: paymentMethod.name, recordedBy: req.user._id,
    });
    return res.status(201).json(sale);
  } catch (error) {
    await restoreStock(branchId, reserved).catch((restoreError) => console.error("Sale stock restoration error:", restoreError));
    if (error.statusCode === 409) return res.status(409).json({ error: error.message });
    if (error.code === 11000) return res.status(409).json({ error: "Unable to generate a unique sale number. Please try again." });
    console.error("Sale creation error:", error);
    return res.status(400).json({ error: "Unable to record this sale. Refresh the menu and try again." });
  }
}

export async function getSalesReport(req, res) {
  if (req.user.role === "staff" && !req.user.branchId) {
    return res.status(400).json({ error: "This staff account is not assigned to a branch." });
  }
  const range = readReportDates(req.query);
  if (!range) return res.status(400).json({ error: "Choose a valid date range." });
  if (req.user.role === "admin" && req.query.branchId && !mongoose.Types.ObjectId.isValid(req.query.branchId)) {
    return res.status(400).json({ error: "Choose a valid branch." });
  }

  try {
    const [sales, onlineOrders, branches] = await Promise.all([
      Sale.find(buildSalesFilter(req, range)).populate("branchId", "name").populate("recordedBy", "name email").sort({ businessDate: -1, createdAt: -1 }).limit(1000),
      Order.find(buildOrderFilter(req, range)).populate("branchId", "name").sort({ updatedAt: -1 }).limit(1000),
      req.user.role === "admin" ? Branch.find().select("name").sort({ name: 1 }) : Promise.resolve([]),
    ]);
    return res.json({ from: range.from, to: range.to, sales, onlineOrders, branches });
  } catch (error) {
    console.error("Sales report error:", error);
    return res.status(500).json({ error: "Unable to load sales reports." });
  }
}
