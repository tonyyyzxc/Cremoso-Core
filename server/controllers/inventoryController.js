import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Inventory from "../models/inventory.js";
import MenuItem from "../models/menuItem.js";
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

  try {
    const [branch, menuItem] = await Promise.all([
      Branch.exists({ _id: branchId }),
      MenuItem.exists({ _id: menuItemId, branchId }),
    ]);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found." });

    const filter = { branchId, menuItemId };
    const previousInventory = await Inventory.findOneAndUpdate(
      filter,
      { $set: { quantity } },
      { new: false, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select("quantity");
    const inventory = await Inventory.findOne(filter)
      .populate("menuItemId", "name active archived")
      .populate("branchId", "name");
    await notifyLowStockTransition({
      branchId,
      stockType: "menuItem",
      stockId: menuItemId,
      previousQuantity: previousInventory?.quantity ?? 0,
      quantity,
    });
    return res.json(inventory);
  } catch (error) {
    console.error("Inventory update error:", error);
    return res.status(400).json({ error: "Unable to save this stock quantity." });
  }
}
