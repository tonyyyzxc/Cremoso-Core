import mongoose from "mongoose";
import Branch from "../models/branch.js";
import MenuItem from "../models/menuItem.js";
import Supply from "../models/supply.js";
import SupplyInventory from "../models/supplyInventory.js";
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
    const quantityBySupplyId = new Map(
      inventory.map((entry) => [entry.supplyId.toString(), entry.quantity]),
    );
    return res.json(supplies.map((supply) => ({
      ...supply.toObject(),
      quantity: quantityBySupplyId.get(supply._id.toString()) ?? 0,
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
    return res.status(201).json(await Supply.create({ name, unit, lowStockThreshold }));
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
    const supply = await Supply.findByIdAndUpdate(req.params.supplyId, updates, {
      new: true,
      runValidators: true,
    });
    if (!supply) return res.status(404).json({ error: "Supply not found." });
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

  try {
    const [branch, supply] = await Promise.all([
      Branch.exists({ _id: branchId }),
      Supply.exists({ _id: supplyId }),
    ]);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    if (!supply) return res.status(404).json({ error: "Supply not found." });

    const filter = { branchId, supplyId };
    const previousInventory = await SupplyInventory.findOneAndUpdate(
      filter,
      { $set: { quantity } },
      { new: false, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select("quantity");
    const inventory = await SupplyInventory.findOne(filter).populate("supplyId");
    await notifyLowStockTransition({
      branchId,
      stockType: "supply",
      stockId: supplyId,
      previousQuantity: previousInventory?.quantity ?? 0,
      quantity,
    });
    return res.json(inventory);
  } catch (error) {
    console.error("Supply stock update error:", error);
    return res.status(400).json({ error: "Unable to save this supply quantity." });
  }
}
