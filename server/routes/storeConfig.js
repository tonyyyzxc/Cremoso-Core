import express from "express";
import StoreConfig from "../models/storeConfig.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const config = await StoreConfig.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: { key: "default" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json(config);
  } catch (error) {
    console.error("Store config load error:", error);
    return res.status(500).json({ error: "Unable to load channel settings." });
  }
});

router.patch("/", requireRole("admin"), async (req, res) => {
  try {
    const current = await StoreConfig.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: { key: "default" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const patchActive = (currentList, requestedList) => {
      if (!Array.isArray(requestedList)) return currentList;
      return currentList.map((entry) => {
        const requested = requestedList.find((value) => value.key === entry.key);
        return requested && typeof requested.active === "boolean"
          ? { ...entry.toObject(), active: requested.active }
          : entry;
      });
    };

    current.channels = patchActive(current.channels, req.body.channels);
    current.paymentMethods = patchActive(current.paymentMethods, req.body.paymentMethods);
    await current.save();
    return res.json(current);
  } catch (error) {
    console.error("Store config update error:", error);
    return res.status(400).json({ error: "Unable to save channel settings." });
  }
});

export default router;
