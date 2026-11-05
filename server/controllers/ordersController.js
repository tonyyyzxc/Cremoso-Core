import mongoose from "mongoose";
import { randomInt } from "node:crypto";
import Branch from "../models/branch.js";
import Inventory from "../models/inventory.js";
import MenuItem from "../models/menuItem.js";
import Order from "../models/order.js";
import Supply from "../models/supply.js";
import SupplyInventory from "../models/supplyInventory.js";
import StoreConfig from "../models/storeConfig.js";

const allowedStatuses = new Set(["pending", "completed", "voided", "refunded"]);

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function createOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
  return `CR-${date}-${randomInt(100000, 1000000)}`;
}

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getManilaDayRange(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  if (!Number.isFinite(start.getTime()) || getManilaDateKey(start) !== dateKey) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function buildOrderFilter(query) {
  const filter = query.archived === "true"
    ? { archivedAt: { $ne: null } }
    : { archivedAt: null };
  if (query.status && query.status !== "all" && allowedStatuses.has(query.status)) {
    filter.status = query.status;
  }
  if (query.branchId && mongoose.Types.ObjectId.isValid(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) filter.createdAt.$lte = new Date(`${query.to}T23:59:59.999Z`);
  }
  if (query.search?.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customer: { $regex: search, $options: "i" } },
    ];
  }
  return filter;
}

export async function createNewOrder(req, res) {
  const branchId = req.user.branchId;
  const body = req.body || {};
  const customer = typeof body.customer === "string" ? body.customer.trim() : "";
  const channelKey = typeof body.channel === "string" ? body.channel : "";
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId.toString())) {
    return res.status(400).json({ error: "This account is not assigned to a branch." });
  }
  if (customer.length > 120) return res.status(400).json({ error: "Customer name or identifier must be 120 characters or fewer." });
  if (!channelKey) return res.status(400).json({ error: "Choose a sales channel." });
  if (!requestedItems.length || requestedItems.length > 50) {
    return res.status(400).json({ error: "Add between 1 and 50 items to the order." });
  }
  if (requestedItems.some((entry) => !entry || typeof entry !== "object")) {
    return res.status(400).json({ error: "One or more order items are invalid." });
  }

  try {
    const [branch, config] = await Promise.all([
      Branch.findById(branchId).select("_id"),
      StoreConfig.findOne({ key: "default" }),
    ]);
    if (!branch) return res.status(400).json({ error: "The branch assigned to this account was not found." });
    const channel = config?.channels.find((entry) => entry.key === channelKey && entry.active);
    if (!channel) return res.status(400).json({ error: "That sales channel is unavailable." });

    const menuItemIds = [...new Set(requestedItems.map((entry) => entry.menuItemId))];
    const addonSelections = requestedItems.flatMap((entry) => Array.isArray(entry.addonSelections) ? entry.addonSelections : []);
    const addonIds = addonSelections.map((entry) => entry?.menuItemId);
    if ([...menuItemIds, ...addonIds].some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "One or more menu items are invalid." });
    }
    const allMenuItemIds = [...new Set([...menuItemIds, ...addonIds])];
    const menuItems = await MenuItem.find({ _id: { $in: allMenuItemIds }, branchId: branch._id });
    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const supplyIds = menuItems.flatMap((item) => [
      ...item.supplyUsage.map((entry) => entry.supplyId),
      ...item.variants.flatMap((variant) => variant.supplyUsage.map((entry) => entry.supplyId)),
    ]);
    const supplies = await Supply.find({ _id: { $in: [...new Set(supplyIds.map(String))] } });
    const supplyById = new Map(supplies.map((supply) => [supply._id.toString(), supply]));
    const snapshotItems = [];

    for (const requested of requestedItems) {
      const item = menuById.get(String(requested.menuItemId));
      const quantity = Number(requested.quantity);
      if (!item || !item.active || item.archived) {
        return res.status(409).json({ error: "A selected menu item is no longer available. Refresh the menu and try again." });
      }
      if (item.itemType === "addon") {
        return res.status(400).json({ error: `${item.name} is an add-on and must be selected with a product.` });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ error: "Item quantities must be between 1 and 99." });
      }

      let variant = null;
      if (requested.variantId) {
        variant = item.variants.id(requested.variantId);
        if (!variant || !variant.active) {
          return res.status(409).json({ error: `${item.name} has a selected variant that is no longer available.` });
        }
      } else if (item.variants.some((entry) => entry.active)) {
        return res.status(400).json({ error: `Choose a variant for ${item.name}.` });
      }

      const requestedAddonIds = Array.isArray(requested.addonIds) ? requested.addonIds : [];
      if (new Set(requestedAddonIds).size !== requestedAddonIds.length) {
        return res.status(400).json({ error: `Remove duplicate add-ons from ${item.name}.` });
      }
      const addons = requestedAddonIds.map((id) => item.addons.id(id));
      if (addons.some((addon) => !addon || !addon.active)) {
        return res.status(409).json({ error: `${item.name} has an add-on that is no longer available.` });
      }

      const includedByCategory = {
        fruits: Number(item.includedFruitPortions || 0),
        toppings: Number(item.includedToppingPortions || 0),
        sauces: Number(item.includedSaucePortions || 0),
      };
      const requestedSelections = Array.isArray(requested.addonSelections) ? requested.addonSelections : [];
      const seenAddonIds = new Set();
      const selectionsByCategory = new Map();
      for (const selection of requestedSelections) {
        const id = String(selection?.menuItemId || "");
        const addon = menuById.get(id);
        const portionQuantity = Number(selection?.quantity);
        if (seenAddonIds.has(id)) return res.status(400).json({ error: `Remove duplicate add-ons from ${item.name}.` });
        seenAddonIds.add(id);
        if (!addon || addon.itemType !== "addon" || !addon.active || addon.archived) {
          return res.status(409).json({ error: `${item.name} has an add-on that is no longer available.` });
        }
        if (!Number.isInteger(portionQuantity) || portionQuantity < 1 || portionQuantity > 99) {
          return res.status(400).json({ error: `Add-on portions for ${addon.name} must be between 1 and 99.` });
        }
        const categoryKey = addon.category.trim().toLowerCase();
        if (!["fruits", "toppings", "sauces"].includes(categoryKey)) {
          return res.status(400).json({ error: `${addon.name} must be categorized as Fruits, Toppings, or Sauces.` });
        }
        if (!selectionsByCategory.has(categoryKey)) selectionsByCategory.set(categoryKey, []);
        selectionsByCategory.get(categoryKey).push({ addon, quantity: portionQuantity });
      }
      const selectedPortionsByCategory = new Map(
        [...selectionsByCategory].map(([key, entries]) => [key, entries.reduce((sum, entry) => sum + entry.quantity, 0)]),
      );
      for (const [key, includedCount] of Object.entries(includedByCategory)) {
        if (includedCount > 0 && !selectedPortionsByCategory.has(key)) {
          const label = key[0].toUpperCase() + key.slice(1).toLowerCase();
          return res.status(400).json({ error: `${item.name} includes ${includedCount} ${label.toLowerCase()} portion${includedCount === 1 ? "" : "s"}. Choose at least that many.` });
        }
      }
      for (const [key, selectedCount] of selectedPortionsByCategory) {
        if (selectedCount < includedByCategory[key]) {
          const label = key[0].toUpperCase() + key.slice(1);
          return res.status(400).json({ error: `${item.name} includes ${includedByCategory[key]} ${label.toLowerCase()} portion${includedByCategory[key] === 1 ? "" : "s"}. Choose at least that many.` });
        }
      }
      const remainingIncluded = { ...includedByCategory };
      const portionSnapshots = [];
      for (const entries of selectionsByCategory.values()) {
        for (const { addon, quantity: portionQuantity } of entries) {
          const key = addon.category.trim().toLowerCase();
          const includedQuantity = Math.min(remainingIncluded[key], portionQuantity);
          remainingIncluded[key] -= includedQuantity;
          portionSnapshots.push({
            menuItemId: addon._id,
            name: addon.name,
            category: addon.category,
            price: addon.price,
            quantity: portionQuantity,
            chargedQuantity: portionQuantity - includedQuantity,
          });
        }
      }
      const addonSnapshots = [
        ...addons.map((addon) => ({ name: addon.name, price: addon.price })),
        ...portionSnapshots,
      ];
      const variantSnapshot = variant ? { name: variant.name, price: variant.price } : { name: "", price: 0 };
      const addonPrice = addonSnapshots.reduce((sum, addon) => sum + addon.price * (addon.chargedQuantity ?? 1), 0);
      const unitPrice = roundMoney(item.price + variantSnapshot.price + addonPrice);
      const supplyUsageById = new Map();
      for (const usage of [...item.supplyUsage, ...(variant?.supplyUsage || [])]) {
        const supply = supplyById.get(usage.supplyId.toString());
        if (!supply || !supply.active) {
          return res.status(409).json({ error: `${item.name} uses a supply that is no longer available.` });
        }
        const existing = supplyUsageById.get(supply._id.toString());
        supplyUsageById.set(supply._id.toString(), {
          supplyId: supply._id,
          name: supply.name,
          unit: supply.unit,
          quantity: (existing?.quantity || 0) + usage.quantity,
        });
      }
      snapshotItems.push({
        menuItemId: item._id,
        name: item.name,
        category: item.category,
        variant: variantSnapshot,
        addons: addonSnapshots,
        supplyUsage: [...supplyUsageById.values()],
        quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * quantity),
      });
    }

    const subtotal = roundMoney(snapshotItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const orderData = {
      branchId: branch._id,
      createdBy: req.user._id,
      customer: customer || "Walk-in",
      channel: channel.name,
      items: snapshotItems,
      subtotal,
      total: subtotal,
      status: "pending",
    };

    const quantitiesByMenuItem = new Map();
    const quantitiesBySupply = new Map();
    for (const orderItem of snapshotItems) {
      const menuItemId = orderItem.menuItemId.toString();
      quantitiesByMenuItem.set(menuItemId, (quantitiesByMenuItem.get(menuItemId) || 0) + orderItem.quantity);
      for (const addon of orderItem.addons) {
        if (!addon.menuItemId) continue;
        const addonId = addon.menuItemId.toString();
        quantitiesByMenuItem.set(addonId, (quantitiesByMenuItem.get(addonId) || 0) + addon.quantity * orderItem.quantity);
      }
      for (const supply of orderItem.supplyUsage) {
        const supplyId = supply.supplyId.toString();
        quantitiesBySupply.set(supplyId, (quantitiesBySupply.get(supplyId) || 0) + supply.quantity * orderItem.quantity);
      }
    }

    const reservedInventory = [];
    const reservedSupplies = [];
    try {
      for (const [menuItemId, quantity] of quantitiesByMenuItem) {
        const stock = await Inventory.findOneAndUpdate(
          { branchId: branch._id, menuItemId, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true },
        );
        if (!stock) {
          const item = menuById.get(menuItemId);
          const error = new Error(`${item?.name || "An item"} does not have enough stock at this branch.`);
          error.statusCode = 409;
          throw error;
        }
        reservedInventory.push({ menuItemId, quantity });
      }

      for (const [supplyId, quantity] of quantitiesBySupply) {
        const stock = await SupplyInventory.findOneAndUpdate(
          { branchId: branch._id, supplyId, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true },
        );
        if (!stock) {
          const supply = supplyById.get(supplyId);
          const error = new Error(`${supply?.name || "A supply"} does not have enough stock at this branch.`);
          error.statusCode = 409;
          throw error;
        }
        reservedSupplies.push({ supplyId, quantity });
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const order = await Order.create({ ...orderData, orderNumber: createOrderNumber() });
          try {
            await order.populate("branchId", "name");
          } catch (populateError) {
            console.error("Order branch lookup error:", populateError);
          }
          return res.status(201).json(order);
        } catch (error) {
          if (error.code !== 11000 || attempt === 2) throw error;
        }
      }
    } catch (error) {
      await Promise.all(reservedInventory.map(({ menuItemId, quantity }) =>
        Inventory.updateOne(
          { branchId: branch._id, menuItemId },
          { $inc: { quantity } },
        ),
      ));
      await Promise.all(reservedSupplies.map(({ supplyId, quantity }) =>
        SupplyInventory.updateOne(
          { branchId: branch._id, supplyId },
          { $inc: { quantity } },
        ),
      ));
      throw error;
    }
  } catch (error) {
    console.error("Order creation error:", error);
    if (error.statusCode === 409) return res.status(409).json({ error: error.message });
    return res.status(400).json({ error: "Unable to place this order. Refresh the menu and try again." });
  }
}

export async function listOrders(req, res) {
  try {
    const orders = await Order.find(buildOrderFilter(req.query))
      .populate("branchId", "name")
      .populate("archivedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json(orders);
  } catch (error) {
    console.error("Orders list error:", error);
    return res.status(500).json({ error: "Unable to load orders." });
  }
}

export async function listStaffOrderQueue(req, res) {
  try {
    const orders = await Order.find({ branchId: req.user.branchId, status: "pending" })
      .sort({ createdAt: 1 })
      .limit(200);
    return res.json(orders);
  } catch (error) {
    console.error("Staff order queue error:", error);
    return res.status(500).json({ error: "Unable to load pending orders." });
  }
}

export async function listStaffTransactions(req, res) {
  const dateKey = typeof req.query.date === "string" ? req.query.date : getManilaDateKey();
  const range = getManilaDayRange(dateKey);
  if (!range) return res.status(400).json({ error: "Select a valid transaction date." });

  try {
    const filter = {
      branchId: req.user.branchId,
      status: "completed",
      updatedAt: { $gte: range.start, $lt: range.end },
    };
    if (req.user.role === "staff") filter.createdBy = req.user._id;
    const orders = await Order.find(filter)
      .sort({ updatedAt: -1 })
      .limit(500);
    return res.json(orders);
  } catch (error) {
    console.error("Staff transactions error:", error);
    return res.status(500).json({ error: "Unable to load completed transactions." });
  }
}

export async function confirmOrderPayment(req, res) {
  const paymentKey = typeof req.body?.paymentMethod === "string" ? req.body.paymentMethod : "";
  try {
    const config = await StoreConfig.findOne({ key: "default" });
    const paymentMethod = (config?.paymentMethods || []).find(
      (entry) => entry.key === paymentKey && entry.active,
    );
    if (!paymentMethod) {
      return res.status(400).json({ error: "Choose an active payment method." });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, status: "pending" },
      { $set: { status: "completed", paymentMethod: paymentMethod.name } },
      { new: true, runValidators: true },
    );
    if (!order) {
      const existingOrder = await Order.findOne({ _id: req.params.id, branchId: req.user.branchId }).select("status");
      if (!existingOrder) return res.status(404).json({ error: "Order not found in your branch." });
      return res.status(409).json({ error: "This order is no longer awaiting payment." });
    }
    return res.json(order);
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return res.status(400).json({ error: "Unable to confirm this payment." });
  }
}

export async function getOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("branchId", "name")
      .populate("archivedBy", "name email")
      .populate("auditTrail.performedBy", "name email");
    if (!order) return res.status(404).json({ error: "Order not found." });
    return res.json(order);
  } catch (error) {
    console.error("Order lookup error:", error);
    return res.status(500).json({ error: "Unable to load this order." });
  }
}

export async function archiveOrder(req, res) {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { $set: { archivedAt: new Date(), archivedBy: req.user._id } },
      { new: true },
    )
      .populate("branchId", "name")
      .populate("archivedBy", "name email");
    if (!order) {
      if (!(await Order.exists({ _id: req.params.id }))) {
        return res.status(404).json({ error: "Order not found." });
      }
      return res.status(409).json({ error: "This order is already archived." });
    }
    return res.json(order);
  } catch (error) {
    console.error("Order archive error:", error);
    return res.status(400).json({ error: "Unable to archive this order." });
  }
}

export async function deleteArchivedOrder(req, res) {
  try {
    const order = await Order.findOneAndDelete({
      _id: req.params.id,
      archivedAt: { $ne: null },
    }).select("orderNumber");
    if (!order) {
      if (!(await Order.exists({ _id: req.params.id }))) {
        return res.status(404).json({ error: "Order not found." });
      }
      return res.status(409).json({ error: "Archive this order before deleting it." });
    }
    return res.json({ id: order._id, orderNumber: order.orderNumber });
  } catch (error) {
    console.error("Archived order deletion error:", error);
    return res.status(400).json({ error: "Unable to delete this archived order." });
  }
}

async function recordOrderAction(req, res, action, branchId = null) {
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) return res.status(400).json({ error: "Enter a reason for this action." });

  try {
    const orderFilter = { _id: req.params.id };
    if (branchId) orderFilter.branchId = branchId;
    const order = await Order.findOne(orderFilter);
    if (!order) return res.status(404).json({ error: "Order not found." });
    const expectedStatus = action === "void" ? "pending" : "completed";
    if (order.status !== expectedStatus) {
      const actionLabel = action === "void" ? "Only pending orders can be voided." : "Only completed orders can be refunded.";
      return res.status(409).json({ error: actionLabel });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { ...orderFilter, status: expectedStatus },
      {
        $set: { status: action === "void" ? "voided" : "refunded" },
        $push: { auditTrail: { action, reason, performedBy: req.user._id, performedAt: new Date() } },
      },
      { new: true, runValidators: true },
    );
    if (!updatedOrder) return res.status(409).json({ error: "This order has already been updated." });

    if (action === "void") {
      const quantitiesByMenuItem = new Map();
      const quantitiesBySupply = new Map();
      for (const item of updatedOrder.items) {
        if (item.menuItemId) {
          const menuItemId = item.menuItemId.toString();
          quantitiesByMenuItem.set(menuItemId, (quantitiesByMenuItem.get(menuItemId) || 0) + item.quantity);
        }
        for (const addon of item.addons) {
          if (!addon.menuItemId) continue;
          const addonId = addon.menuItemId.toString();
          quantitiesByMenuItem.set(addonId, (quantitiesByMenuItem.get(addonId) || 0) + addon.quantity * item.quantity);
        }
        for (const supply of item.supplyUsage || []) {
          const supplyId = supply.supplyId.toString();
          quantitiesBySupply.set(supplyId, (quantitiesBySupply.get(supplyId) || 0) + supply.quantity * item.quantity);
        }
      }
      await Promise.all([
        ...[...quantitiesByMenuItem].map(([menuItemId, quantity]) =>
        Inventory.updateOne(
          { branchId: updatedOrder.branchId, menuItemId },
          { $inc: { quantity } },
        )),
        ...[...quantitiesBySupply].map(([supplyId, quantity]) =>
          SupplyInventory.updateOne(
            { branchId: updatedOrder.branchId, supplyId },
            { $inc: { quantity } },
          )),
      ]);
    }
    await updatedOrder.populate("branchId", "name");
    await updatedOrder.populate("auditTrail.performedBy", "name email");
    return res.json(updatedOrder);
  } catch (error) {
    console.error(`Order ${action} error:`, error);
    return res.status(400).json({ error: `Unable to ${action} this order.` });
  }
}

export async function voidOrder(req, res) {
  return recordOrderAction(req, res, "void");
}

export async function voidStaffOrder(req, res) {
  return recordOrderAction(req, res, "void", req.user.branchId);
}

export async function refundOrder(req, res) {
  return recordOrderAction(req, res, "refund");
}
