// API handlers for inventory listings and quantity updates.
import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Inventory from "../models/inventory.js";
import MenuItem from "../models/menuItem.js";
import { getEditMetadata, logActivity } from "../utils/activityLog.js";
import { notifyLowStockTransition } from "../utils/pushNotifications.js";

export async function listInventory(req, res) {
  const branchId = req.user.role !== "admin"
    ? req.user.branchId?.toString()
    : typeof req.query.branchId === "string" ? req.query.branchId : "";

  if (req.user.role !== "admin" && !branchId) {
    return res.status(400).json({ error: "This account is not assigned to a branch." });
  }
  if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
    return res.status(400).json({ error: "Select a valid branch." });
  }

  try {
    const filter = branchId ? { branchId } : {};
    const inventory = await Inventory.find(filter)
      .populate("menuItemId", "name active archived")
      .populate("branchId", "name")
      .sort({ updatedAt: -1 });
    return res.json(inventory);
  } catch (error) {
    console.error("Inventory list error:", error);
    return res.status(500).json({ error: "Unable to load branch inventory." });
  }
}

export async function setInventoryQuantity(req, res) {
  const branchId = typeof req.body.branchId === "string" ? req.body.branchId : "";
  const menuItemId = req.params.menuItemId;
  const quantity = req.body.quantity;

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return res.status(400).json({ error: "Select a valid branch." });
  }
  if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
    return res.status(400).json({ error: "Select a valid menu item." });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "Stock quantity must be a whole number of zero or more." });
  }
  const expectedVersion = req.body.__v;
  if (!Number.isInteger(expectedVersion) || expectedVersion < -1) {
    return res.status(400).json({ error: "Reload this inventory record before saving it." });
  }

  try {
    const [branch, menuItem] = await Promise.all([
      Branch.exists({ _id: branchId }),
      MenuItem.exists({ _id: menuItemId, branchId }),
    ]);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found." });

    if (expectedVersion === -1) {
      // Version -1 means the client saw no stock row and is creating its initial quantity.
      const createdInventory = await Inventory.create({
        branchId, menuItemId, quantity, ...getEditMetadata(req.user),
      });
      const inventory = await Inventory.findById(createdInventory._id)
        .populate("menuItemId", "name active archived")
        .populate("branchId", "name");
      await notifyLowStockTransition({
        branchId,
        stockType: "menuItem",
        stockId: menuItemId,
        previousQuantity: 0,
        quantity,
      });
      await logActivity(req, {
        action: "create",
        category: "inventory",
        summary: "Created an inventory stock record.",
        target: { type: "Inventory", id: `${branchId}:${menuItemId}` },
        details: { changedFields: ["quantity"] },
      });
      return res.json(inventory);
    }

    // Match the version the client read so a stale quantity cannot overwrite newer stock.
    const filter = { branchId, menuItemId, __v: expectedVersion };
    const previousInventory = await Inventory.findOneAndUpdate(
      filter,
      { $set: { quantity, ...getEditMetadata(req.user) }, $inc: { __v: 1 } },
      { returnDocument: "before", runValidators: true },
    ).select("quantity");
    if (!previousInventory) {
      return res.status(409).json({ error: "Inventory changed since you loaded it. Reload and try again." });
    }
    const inventory = await Inventory.findOne({ branchId, menuItemId })
      .populate("menuItemId", "name active archived")
      .populate("branchId", "name");
    await notifyLowStockTransition({
      branchId,
      stockType: "menuItem",
      stockId: menuItemId,
      previousQuantity: previousInventory?.quantity ?? 0,
      quantity,
    });
    if (previousInventory.quantity !== quantity) {
      await logActivity(req, {
        action: "update",
        category: "inventory",
        summary: "Updated inventory stock.",
        target: { type: "Inventory", id: `${branchId}:${menuItemId}` },
        details: { changedFields: ["quantity"] },
      });
    }
    return res.json(inventory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Inventory changed since you loaded it. Reload and try again." });
    }
    console.error("Inventory update error:", error);
    return res.status(400).json({ error: "Unable to save this stock quantity." });
  }
}
