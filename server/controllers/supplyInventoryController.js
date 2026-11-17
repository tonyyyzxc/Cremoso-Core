import mongoose from "mongoose";
import Branch from "../models/branch.js";
import MenuItem from "../models/menuItem.js";
import Supply from "../models/supply.js";
import SupplyInventory from "../models/supplyInventory.js";
import { getChangedFieldNames, getEditMetadata, logActivity } from "../utils/activityLog.js";
import { notifyLowStockTransition } from "../utils/pushNotifications.js";

export async function listSupplies(req, res) {
  const branchId = req.user.role === "branch"
    ? req.user.branchId?.toString() || ""
    : typeof req.query.branchId === "string" ? req.query.branchId : "";
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return res.status(400).json({ error: "Select a valid branch." });
  }

  try {
    const [supplies, inventory] = await Promise.all([
      Supply.find().sort({ name: 1 }),
      SupplyInventory.find({ branchId }),
    ]);
    const inventoryBySupplyId = new Map(
      inventory.map((entry) => [entry.supplyId.toString(), entry]),
    );
    return res.json(supplies.map((supply) => ({
      ...supply.toObject(),
      quantity: inventoryBySupplyId.get(supply._id.toString())?.quantity ?? 0,
      inventoryVersion: inventoryBySupplyId.get(supply._id.toString())?.__v ?? -1,
    })));
  } catch (error) {
    console.error("Supply inventory list error:", error);
    return res.status(500).json({ error: "Unable to load supply inventory." });
  }
}

export async function createSupply(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const unit = typeof req.body.unit === "string" ? req.body.unit.trim() : "";
  const lowStockThreshold = req.body.lowStockThreshold;
  if (!name || !unit) {
    return res.status(400).json({ error: "Enter a supply name and unit." });
  }
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
    return res.status(400).json({ error: "Low stock threshold must be a whole number of zero or more." });
  }

  try {
    const supply = await Supply.create({
      name, unit, lowStockThreshold, ...getEditMetadata(req.user),
    });
    await logActivity(req, {
      action: "create",
      category: "inventory",
      summary: "Created a supply.",
      target: { type: "Supply", id: supply._id, label: supply.name },
      details: { changedFields: ["name", "unit", "lowStockThreshold"] },
    });
    return res.status(201).json(supply);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "A supply with this name already exists." });
    console.error("Supply creation error:", error);
    return res.status(400).json({ error: "Unable to create this supply." });
  }
}

export async function updateSupply(req, res) {
  const updates = {};
  if (typeof req.body.name === "string") updates.name = req.body.name.trim();
  if (typeof req.body.unit === "string") updates.unit = req.body.unit.trim();
  if (typeof req.body.active === "boolean") updates.active = req.body.active;
  if (req.body.lowStockThreshold !== undefined) {
    if (!Number.isInteger(req.body.lowStockThreshold) || req.body.lowStockThreshold < 0) {
      return res.status(400).json({ error: "Low stock threshold must be a whole number of zero or more." });
    }
    updates.lowStockThreshold = req.body.lowStockThreshold;
  }
  if (updates.name === "" || updates.unit === "") {
    return res.status(400).json({ error: "Supply name and unit cannot be empty." });
  }

  try {
    const previousSupply = await Supply.findById(req.params.supplyId);
    if (!previousSupply) return res.status(404).json({ error: "Supply not found." });
    const supply = await Supply.findByIdAndUpdate(req.params.supplyId, {
      $set: { ...updates, ...getEditMetadata(req.user) },
    }, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!supply) return res.status(404).json({ error: "Supply not found." });
    const changedFields = getChangedFieldNames(previousSupply, supply, Object.keys(updates));
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "inventory",
        summary: "Updated a supply.",
        target: { type: "Supply", id: supply._id, label: supply.name },
        details: { changedFields },
      });
    }
    return res.json(supply);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "A supply with this name already exists." });
    console.error("Supply update error:", error);
    return res.status(400).json({ error: "Unable to update this supply." });
  }
}

export async function deleteSupply(req, res) {
  try {
    const supply = await Supply.findById(req.params.supplyId);
    if (!supply) return res.status(404).json({ error: "Supply not found." });

    const isInUse = await MenuItem.exists({
      $or: [
        { "supplyUsage.supplyId": supply._id },
        { "variants.supplyUsage.supplyId": supply._id },
      ],
    });
    if (isInUse) {
      return res.status(409).json({
        error: "This supply is assigned to a menu item or variant. Remove those usage settings before deleting it.",
      });
    }

    await SupplyInventory.deleteMany({ supplyId: supply._id });
    await supply.deleteOne();
    await logActivity(req, {
      action: "delete",
      category: "inventory",
      summary: "Deleted a supply.",
      target: { type: "Supply", id: supply._id, label: supply.name },
      details: { changedFields: Object.keys(supply.toObject()) },
    });
    return res.json({ id: supply._id, message: "Supply deleted." });
  } catch (error) {
    console.error("Supply deletion error:", error);
    return res.status(400).json({ error: "Unable to delete this supply." });
  }
}

export async function setBranchSupplyQuantity(req, res) {
  const { branchId, quantity } = req.body;
  const { supplyId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(supplyId)) {
    return res.status(400).json({ error: "Select a valid branch and supply." });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "Stock quantity must be a whole number of zero or more." });
  }
  const expectedVersion = req.body.__v;
  if (!Number.isInteger(expectedVersion) || expectedVersion < -1) {
    return res.status(400).json({ error: "Reload this supply inventory record before saving it." });
  }

  try {
    const [branch, supply] = await Promise.all([
      Branch.exists({ _id: branchId }),
      Supply.exists({ _id: supplyId }),
    ]);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    if (!supply) return res.status(404).json({ error: "Supply not found." });

    if (expectedVersion === -1) {
      // Version -1 means no branch stock row existed when the client loaded the supply.
      const createdInventory = await SupplyInventory.create({
        branchId, supplyId, quantity, ...getEditMetadata(req.user),
      });
      const inventory = await SupplyInventory.findById(createdInventory._id).populate("supplyId");
      await notifyLowStockTransition({
        branchId,
        stockType: "supply",
        stockId: supplyId,
        previousQuantity: 0,
        quantity,
      });
      await logActivity(req, {
        action: "create",
        category: "inventory",
        summary: "Created a supply stock record.",
        target: { type: "SupplyInventory", id: `${branchId}:${supplyId}` },
        details: { changedFields: ["quantity"] },
      });
      return res.json(inventory);
    }

    // Match the version the client read so a stale quantity cannot overwrite newer stock.
    const filter = { branchId, supplyId, __v: expectedVersion };
    const previousInventory = await SupplyInventory.findOneAndUpdate(
      filter,
      { $set: { quantity, ...getEditMetadata(req.user) }, $inc: { __v: 1 } },
      { returnDocument: "before", runValidators: true },
    ).select("quantity");
    if (!previousInventory) {
      return res.status(409).json({ error: "Supply inventory changed since you loaded it. Reload and try again." });
    }
    const inventory = await SupplyInventory.findOne({ branchId, supplyId }).populate("supplyId");
    await notifyLowStockTransition({
      branchId,
      stockType: "supply",
      stockId: supplyId,
      previousQuantity: previousInventory?.quantity ?? 0,
      quantity,
    });
    if (previousInventory.quantity !== quantity) {
      await logActivity(req, {
        action: "update",
        category: "inventory",
        summary: "Updated supply stock.",
        target: { type: "SupplyInventory", id: `${branchId}:${supplyId}` },
        details: { changedFields: ["quantity"] },
      });
    }
    return res.json(inventory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Supply inventory changed since you loaded it. Reload and try again." });
    }
    console.error("Supply stock update error:", error);
    return res.status(400).json({ error: "Unable to save this supply quantity." });
  }
}
