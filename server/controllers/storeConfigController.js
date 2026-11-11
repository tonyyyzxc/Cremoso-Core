import StoreConfig from "../models/storeConfig.js";

const getConfig = () => StoreConfig.findOneAndUpdate(
  { key: "default" },
  { $setOnInsert: { key: "default" } },
  { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
);

export async function getStoreConfig(_req, res) {
  try {
    return res.json(await getConfig());
  } catch (error) {
    console.error("Store config load error:", error);
    return res.status(500).json({ error: "Unable to load channel settings." });
  }
}

export async function updateStoreConfig(req, res) {
  try {
    const current = await getConfig();
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
}
