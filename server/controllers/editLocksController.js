import mongoose from "mongoose";
import Branch from "../models/branch.js";
import EditLock from "../models/editLock.js";
import MenuItem from "../models/menuItem.js";
import Order from "../models/order.js";
import PushRegistration from "../models/pushRegistration.js";
import ShiftSchedule from "../models/shiftSchedule.js";
import Supply from "../models/supply.js";
import User from "../models/user.js";
import Worker from "../models/Worker.js";
import { isSuperAdminAccount } from "../utils/superAdmin.js";
import { normalizeEditResource } from "../utils/editLock.js";

const LEASE_DURATION_MS = 5 * 60 * 1000;

function readResource(req, res, source = req.body) {
  const resource = normalizeEditResource(source?.resourceType, source?.resourceId);
  if (!resource) {
    res.status(400).json({ error: "Select a valid record to edit." });
    return null;
  }
  return resource;
}

async function authorizeResource(req, res, resource) {
  const { resourceType, resourceId } = resource;
  const isAdmin = req.user.role === "admin";
  const isBranch = req.user.role === "branch";
  const ownBranchId = req.user.branchId?.toString();

  if (resourceType === "IntegrationCredential") {
    if (isSuperAdminAccount(req.user)) return true;
    res.status(403).json({ error: "You cannot edit these credentials." });
    return false;
  }
  if (resourceType === "PushRegistration") {
    const registration = await PushRegistration.findOne({
      browserId: resourceId,
      userId: req.user._id,
    }).select("_id");
    if (!registration) {
      res.status(404).json({ error: "Push registration not found." });
      return false;
    }
    return true;
  }
  if (["AuthConfig", "StoreConfig", "MenuItem", "Supply"].includes(resourceType)) {
    if (isAdmin) return true;
    res.status(403).json({ error: "You cannot edit this record." });
    return false;
  }
  if (resourceType === "Inventory" || resourceType === "SupplyInventory") {
    const [branchId, recordId] = resourceId.split(":");
    if (
      !mongoose.Types.ObjectId.isValid(branchId)
      || !mongoose.Types.ObjectId.isValid(recordId)
    ) {
      res.status(400).json({ error: "Select a valid stock record." });
      return false;
    }
    if (!isAdmin) {
      res.status(403).json({ error: "You cannot edit this stock record." });
      return false;
    }
    const exists = resourceType === "Inventory"
      ? await MenuItem.exists({ _id: recordId, branchId })
      : await Supply.exists({ _id: recordId });
    if (!exists || !(await Branch.exists({ _id: branchId }))) {
      res.status(404).json({ error: "Stock record not found." });
      return false;
    }
    return true;
  }
  if (resourceType === "User") {
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      res.status(400).json({ error: "Select a valid account." });
      return false;
    }
    const target = await User.findById(resourceId).select("role email");
    if (!target) {
      res.status(404).json({ error: "Account not found." });
      return false;
    }
    if (target._id.equals(req.user._id)) return true;
    if (
      isAdmin
      && (!isSuperAdminAccount(target) || isSuperAdminAccount(req.user))
    ) return true;
    res.status(403).json({ error: "You cannot edit this account." });
    return false;
  }

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    res.status(400).json({ error: "Select a valid record to edit." });
    return false;
  }

  if (resourceType === "Branch") {
    const branch = await Branch.findById(resourceId).select("_id");
    if (!branch) {
      res.status(404).json({ error: "Branch not found." });
      return false;
    }
    if (isAdmin || (isBranch && ownBranchId === resourceId)) return true;
  } else if (resourceType === "Worker") {
    const worker = await Worker.findById(resourceId).select("branchId");
    if (!worker) {
      res.status(404).json({ error: "Worker not found." });
      return false;
    }
    if (isAdmin || (isBranch && worker.branchId.toString() === ownBranchId)) return true;
  } else if (resourceType === "ShiftSchedule") {
    const shift = await ShiftSchedule.findById(resourceId).select("branchId");
    if (!shift) {
      res.status(404).json({ error: "Shift not found." });
      return false;
    }
    if (isAdmin || (isBranch && shift.branchId.toString() === ownBranchId)) return true;
  } else if (resourceType === "Order") {
    const order = await Order.findById(resourceId).select("branchId");
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return false;
    }
    if (isAdmin || (ownBranchId && order.branchId.toString() === ownBranchId)) return true;
  }

  res.status(403).json({ error: "You cannot edit this record." });
  return false;
}

function activeLockFilter(resourceKey) {
  return { resourceKey, expiresAt: { $gt: new Date() } };
}

export async function acquireEditLock(req, res) {
  const resource = readResource(req, res);
  if (!resource || !(await authorizeResource(req, res, resource))) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  try {
    const current = await EditLock.findOne(activeLockFilter(resource.resourceKey));
    if (current) {
      if (!current.ownerUserId.equals(req.user._id)) {
        return res.status(423).json({ error: "Another user is editing this record." });
      }
      current.expiresAt = expiresAt;
      await current.save();
      return res.json({ acquired: true, expiresAt });
    }

    const reclaimed = await EditLock.findOneAndUpdate(
      { resourceKey: resource.resourceKey, expiresAt: { $lte: now } },
      {
        $set: {
          resourceType: resource.resourceType,
          resourceId: resource.resourceId,
          ownerUserId: req.user._id,
          expiresAt,
        },
      },
      { returnDocument: "after" },
    );
    if (reclaimed) return res.json({ acquired: true, expiresAt });

    await EditLock.create({
      ...resource,
      ownerUserId: req.user._id,
      expiresAt,
    });
    return res.status(201).json({ acquired: true, expiresAt });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(423).json({ error: "Another user is editing this record." });
    }
    console.error("Edit lock acquisition error:", error);
    return res.status(500).json({ error: "Unable to lock this record for editing." });
  }
}

export async function getEditLockStatus(req, res) {
  const resource = readResource(req, res, req.query);
  if (!resource || !(await authorizeResource(req, res, resource))) return;

  try {
    const lock = await EditLock.findOne(activeLockFilter(resource.resourceKey))
      .select("ownerUserId expiresAt");
    return res.json({
      locked: Boolean(lock && !lock.ownerUserId.equals(req.user._id)),
      expiresAt: lock?.expiresAt || null,
    });
  } catch (error) {
    console.error("Edit lock status error:", error);
    return res.status(500).json({ error: "Unable to check whether this record is locked." });
  }
}

export async function renewEditLock(req, res) {
  const resource = readResource(req, res);
  if (!resource || !(await authorizeResource(req, res, resource))) return;

  try {
    const lock = await EditLock.findOneAndUpdate(
      {
        resourceKey: resource.resourceKey,
        ownerUserId: req.user._id,
        expiresAt: { $gt: new Date() },
      },
      { $set: { expiresAt: new Date(Date.now() + LEASE_DURATION_MS) } },
      { returnDocument: "after" },
    ).select("expiresAt");
    if (!lock) return res.status(409).json({ error: "Your edit lock expired. Reopen the editor." });
    return res.json({ renewed: true, expiresAt: lock.expiresAt });
  } catch (error) {
    console.error("Edit lock renewal error:", error);
    return res.status(500).json({ error: "Unable to renew the edit lock." });
  }
}

export async function releaseEditLock(req, res) {
  const resource = readResource(req, res);
  if (!resource) return;

  try {
    const result = await EditLock.deleteOne({
      resourceKey: resource.resourceKey,
      ownerUserId: req.user._id,
    });
    return res.json({ released: result.deletedCount > 0 });
  } catch (error) {
    console.error("Edit lock release error:", error);
    return res.status(500).json({ error: "Unable to release the edit lock." });
  }
}
