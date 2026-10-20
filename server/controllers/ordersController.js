import mongoose from "mongoose";
import { randomInt } from "node:crypto";
import Branch from "../models/branch.js";
import MenuItem from "../models/menuItem.js";
import Order from "../models/order.js";
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

function buildOrderFilter(query) {
  const filter = {};
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
    return res.status(400).json({ error: "This staff account is not assigned to a branch." });
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
    if (menuItemIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "One or more menu items are invalid." });
    }
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const snapshotItems = [];

    for (const requested of requestedItems) {
      const item = menuById.get(String(requested.menuItemId));
      const quantity = Number(requested.quantity);
      if (!item || !item.active || item.archived) {
        return res.status(409).json({ error: "A selected menu item is no longer available. Refresh the menu and try again." });
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

      const addonSnapshots = addons.map((addon) => ({ name: addon.name, price: addon.price }));
      const variantSnapshot = variant ? { name: variant.name, price: variant.price } : { name: "", price: 0 };
      const unitPrice = roundMoney(item.price + variantSnapshot.price + addonSnapshots.reduce((sum, addon) => sum + addon.price, 0));
      snapshotItems.push({
        name: item.name,
        category: item.category,
        variant: variantSnapshot,
        addons: addonSnapshots,
        quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * quantity),
      });
    }

    const subtotal = roundMoney(snapshotItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const orderData = {
      branchId: branch._id,
      customer: customer || "Walk-in",
      channel: channel.name,
      items: snapshotItems,
      subtotal,
      total: subtotal,
      status: "pending",
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const order = await Order.create({ ...orderData, orderNumber: createOrderNumber() });
        await order.populate("branchId", "name");
        return res.status(201).json(order);
      } catch (error) {
        if (error.code !== 11000 || attempt === 2) throw error;
      }
    }
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(400).json({ error: "Unable to place this order. Refresh the menu and try again." });
  }
}

export async function listOrders(req, res) {
  try {
    const orders = await Order.find(buildOrderFilter(req.query))
      .populate("branchId", "name")
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json(orders);
  } catch (error) {
    console.error("Orders list error:", error);
    return res.status(500).json({ error: "Unable to load orders." });
  }
}

export async function getOrder(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }
  try {
    const order = await Order.findById(req.params.id)
      .populate("branchId", "name")
      .populate("auditTrail.performedBy", "name email");
    if (!order) return res.status(404).json({ error: "Order not found." });
    return res.json(order);
  } catch (error) {
    console.error("Order lookup error:", error);
    return res.status(500).json({ error: "Unable to load this order." });
  }
}

async function recordOrderAction(req, res, action) {
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) return res.status(400).json({ error: "Enter a reason for this action." });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    const expectedStatus = action === "void" ? "pending" : "completed";
    if (order.status !== expectedStatus) {
      const actionLabel = action === "void" ? "Only pending orders can be voided." : "Only completed orders can be refunded.";
      return res.status(409).json({ error: actionLabel });
    }

    order.status = action === "void" ? "voided" : "refunded";
    order.auditTrail.push({ action, reason, performedBy: req.user._id, performedAt: new Date() });
    await order.save();
    await order.populate("branchId", "name");
    await order.populate("auditTrail.performedBy", "name email");
    return res.json(order);
  } catch (error) {
    console.error(`Order ${action} error:`, error);
    return res.status(400).json({ error: `Unable to ${action} this order.` });
  }
}

export async function voidOrder(req, res) {
  return recordOrderAction(req, res, "void");
}

export async function refundOrder(req, res) {
  return recordOrderAction(req, res, "refund");
}
