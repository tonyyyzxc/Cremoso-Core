import Branch from "../models/branch.js";
import User from "../models/user.js";
import Worker from "../models/Worker.js";
import { getChangedFieldNames, getEditMetadata, logActivity } from "../utils/activityLog.js";

export async function getStaffBranch(req, res) {
  if (!req.user.branchId) return res.json({ branch: null, manager: null, coworkers: [] });
  try {
    const [branch, coworkers] = await Promise.all([
      Branch.findById(req.user.branchId).select("name address phone contactEmail"),
      User.find({ branchId: req.user.branchId, role: "staff" })
        .select("name email phone status").sort({ name: 1, email: 1 }),
    ]);
    return res.json({
      branch,
      manager: { _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
      coworkers,
    });
  } catch (error) {
    console.error("Branch staff lookup error:", error);
    return res.status(500).json({ error: "Unable to load your branch information." });
  }
}

export async function updateStaffProfile(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  if (!name) return res.status(400).json({ error: "Enter your name." });
  try {
    const manager = await User.findById(req.user._id);
    if (!manager) return res.status(404).json({ error: "Account not found." });
    const before = manager.toObject();
    manager.name = name;
    manager.phone = phone;
    Object.assign(manager, getEditMetadata(manager));
    await manager.save();
    const changedFields = getChangedFieldNames(before, manager, ["name", "phone"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "user",
        summary: "Updated manager profile.",
        target: { type: "User", id: manager._id, label: manager.email },
        details: { changedFields },
      });
    }
    return res.json({
      manager: {
        _id: manager._id, name: manager.name, email: manager.email, phone: manager.phone,
        lastEditedBy: manager.lastEditedBy,
        lastEditedByName: manager.lastEditedByName,
        lastEditedByRole: manager.lastEditedByRole,
        lastEditedAt: manager.lastEditedAt,
      },
    });
  } catch (error) {
    console.error("Manager profile update error:", error);
    return res.status(400).json({ error: "Unable to save your manager information." });
  }
}

export async function updateStaffBranch(req, res) {
  if (!req.user.branchId) return res.status(400).json({ error: "No branch is assigned to your account." });
  const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const contactEmail = typeof req.body.contactEmail === "string" ? req.body.contactEmail.trim().toLowerCase() : "";
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return res.status(400).json({ error: "Enter a valid branch contact email." });
  }
  try {
    const branch = await Branch.findById(req.user.branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    const before = branch.toObject();
    branch.address = address;
    branch.phone = phone;
    branch.contactEmail = contactEmail;
    Object.assign(branch, getEditMetadata(req.user));
    await branch.save();
    const changedFields = getChangedFieldNames(before, branch, ["address", "phone", "contactEmail"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "branch",
        summary: "Updated branch contact details.",
        target: { type: "Branch", id: branch._id, label: branch.name },
        details: { changedFields },
      });
    }
    return res.json({ branch: {
      _id: branch._id, name: branch.name, address: branch.address,
      phone: branch.phone, contactEmail: branch.contactEmail,
      lastEditedBy: branch.lastEditedBy,
      lastEditedByName: branch.lastEditedByName,
      lastEditedByRole: branch.lastEditedByRole,
      lastEditedAt: branch.lastEditedAt,
    } });
  } catch (error) {
    console.error("Branch info update error:", error);
    return res.status(400).json({ error: "Unable to save your branch details." });
  }
}

export async function listStaffWorkers(req, res) {
  if (!req.user.branchId) return res.json([]);
  try {
    return res.json(await Worker.find({ branchId: req.user.branchId }).sort({ name: 1 }));
  } catch (error) {
    console.error("Worker list error:", error);
    return res.status(500).json({ error: "Unable to load your workers." });
  }
}

export async function createStaffWorker(req, res) {
  if (!req.user.branchId) return res.status(400).json({ error: "No branch is assigned to your account." });
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
  if (!name || !phone || !email || !address) {
    return res.status(400).json({ error: "Enter the worker's name, email, phone, and address." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid worker email." });
  }
  try {
    const worker = await Worker.create({
      name, phone, email, address, branchId: req.user.branchId,
      ...getEditMetadata(req.user),
    });
    await logActivity(req, {
      action: "create",
      category: "user",
      summary: "Created a worker record.",
      target: { type: "Worker", id: worker._id, label: worker.name },
      details: { changedFields: ["name", "phone", "email", "address", "branchId"] },
    });
    return res.status(201).json(worker);
  } catch (error) {
    console.error("Worker creation error:", error);
    return res.status(400).json({ error: "Unable to add this worker." });
  }
}

export async function deleteStaffWorker(req, res) {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, branchId: req.user.branchId });
    if (!worker) return res.status(404).json({ error: "Worker not found." });
    await worker.deleteOne();
    await logActivity(req, {
      action: "delete",
      category: "user",
      summary: "Deleted a worker record.",
      target: { type: "Worker", id: worker._id, label: worker.name },
      details: { changedFields: ["name", "phone", "email", "address", "branchId"] },
    });
    return res.json({ id: worker._id, message: "Worker removed." });
  } catch (error) {
    console.error("Worker deletion error:", error);
    return res.status(400).json({ error: "Unable to remove this worker." });
  }
}
