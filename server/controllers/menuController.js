import mongoose from "mongoose";
import Branch from "../models/branch.js";
import MenuItem from "../models/menuItem.js";

function getBranchId(req) {
  return req.user.role !== "admin" ? req.user.branchId?.toString() || "" : req.query.branchId || req.body.branchId || "";
}

async function validateBranchId(branchId, res) {
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    res.status(400).json({ error: "Select a valid branch for this menu." });
    return false;
  }
  if (!(await Branch.exists({ _id: branchId }))) {
    res.status(404).json({ error: "Branch not found." });
    return false;
  }
  return true;
}

export async function listMenuItems(req, res) {
  const branchId = getBranchId(req);
  try {
    if (!(await validateBranchId(branchId, res))) return;
    const items = await MenuItem.find({ branchId }).sort({ displayOrder: 1, name: 1 });
    return res.json(items);
  } catch (error) {
    console.error("Menu list error:", error);
    return res.status(500).json({ error: "Unable to load menu items." });
  }
}

export async function createMenuItem(req, res) {
  const branchId = getBranchId(req);
  try {
    if (!(await validateBranchId(branchId, res))) return;
    const item = await MenuItem.create({ ...req.body, branchId });
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid menu item." });
  }
}

export async function updateMenuItem(req, res) {
  const branchId = getBranchId(req);
  try {
    if (!(await validateBranchId(branchId, res))) return;
    const allowed = ["name", "description", "itemType", "category", "price", "includedFruitPortions", "includedToppingPortions", "includedSaucePortions", "active", "archived", "displayOrder", "supplyUsage", "variants", "addons"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, branchId },
      updates,
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ error: "Menu item not found in this branch." });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update menu item." });
  }
}

export async function deleteMenuItem(req, res) {
  const branchId = getBranchId(req);
  try {
    if (!(await validateBranchId(branchId, res))) return;
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, branchId });
    if (!item) return res.status(404).json({ error: "Menu item not found in this branch." });
    return res.json({ message: "Menu item deleted." });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to delete menu item." });
  }
}
