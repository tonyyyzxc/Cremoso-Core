// Utilities for normalizing and enforcing collaborative edit locks.
import EditLock from "../models/editLock.js";

const EDITABLE_RESOURCE_TYPES = new Set([
  "AuthConfig",
  "Branch",
  "IntegrationCredential",
  "Inventory",
  "MenuItem",
  "Order",
  "PushRegistration",
  "ShiftSchedule",
  "StoreConfig",
  "Supply",
  "SupplyInventory",
  "User",
  "Worker",
]);

export function normalizeEditResource(resourceType, resourceId) {
  if (
    !EDITABLE_RESOURCE_TYPES.has(resourceType)
    || typeof resourceId !== "string"
    || !/^[\w:-]{1,160}$/.test(resourceId)
  ) {
    return null;
  }
  return {
    resourceType,
    resourceId,
    resourceKey: `${resourceType}:${resourceId}`,
  };
}

export function requireEditLock(resourceType, getResourceId, shouldSkip = () => false) {
  return async (req, res, next) => {
    try {
      if (await shouldSkip(req)) return next();
      const resourceId = await getResourceId(req);
      if (resourceId === null) return next();
      const resource = normalizeEditResource(resourceType, resourceId);
      if (!resource) {
        return res.status(400).json({ error: "Select a valid record to edit." });
      }

      const lock = await EditLock.findOne({
        resourceKey: resource.resourceKey,
        ownerUserId: req.user._id,
        expiresAt: { $gt: new Date() },
      }).select("_id");
      if (!lock) {
        return res.status(423).json({
          error: "This record is locked or your edit lock expired. Reopen the editor to continue.",
        });
      }
      return next();
    } catch (error) {
      console.error("Edit lock verification error:", error);
      return res.status(500).json({ error: "Unable to verify the edit lock." });
    }
  };
}
