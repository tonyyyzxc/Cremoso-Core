import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Session from "../models/session.js";
import User from "../models/user.js";
import Worker from "../models/Worker.js";
import { getChangedFieldNames, getEditMetadata, logActivity } from "../utils/activityLog.js";
import { hashPassword } from "../utils/password.js";
import { isSuperAdminAccount } from "../utils/superAdmin.js";

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function createUser(req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = req.body.role;
  const branchId = typeof req.body.branchId === "string" ? req.body.branchId : "";
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long." });
  if (role === "admin" && !isSuperAdminAccount(req.user)) {
    return res.status(403).json({ error: "Only the Super Admin can create Admin accounts." });
  }
  if (!["admin", "branch", "staff"].includes(role)) return res.status(400).json({ error: "Role must be admin, branch, or staff." });
  if (role === "admin" && !name) return res.status(400).json({ error: "Enter the admin's name." });
  if (role !== "admin" && !name) return res.status(400).json({ error: "Enter the account holder's name." });
  if (role !== "admin" && !mongoose.Types.ObjectId.isValid(branchId)) return res.status(400).json({ error: "Select a branch for this account." });
  try {
    if (branchId && !(await Branch.exists({ _id: branchId }))) return res.status(400).json({ error: "Selected branch was not found." });
    if (await User.findOne({ email })) return res.status(409).json({ error: "An account with this email address already exists." });
    const user = await User.create({
      name,
      phone,
      email,
      passwordHash: await hashPassword(password),
      role,
      status: "active",
      branchId: branchId || null,
      ...getEditMetadata(req.user),
    });
    await logActivity(req, {
      action: "create",
      category: "user",
      summary: "Created a user account.",
      target: { type: "User", id: user._id, label: user.email },
      details: { changedFields: ["name", "phone", "email", "role", "status", "branchId"] },
    });
    await user.populate("branchId", "name");
    return res.status(201).json({
      _id: user._id, name: user.name, phone: user.phone, email: user.email,
      role: user.role, isSuperAdmin: isSuperAdminAccount(user), status: user.status, branchId: user.branchId,
      lastEditedBy: user.lastEditedBy,
      lastEditedByName: user.lastEditedByName,
      lastEditedByRole: user.lastEditedByRole,
      lastEditedAt: user.lastEditedAt,
    });
  } catch (error) {
    console.error("Account creation error:", error);
    return res.status(400).json({ error: "Unable to create this account." });
  }
}

export async function listBranchStaff(req, res) {
  const branchId = req.user.branchId?.toString();
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    return res.status(400).json({ error: "Your account is not assigned to a branch." });
  }
  try {
    const users = await User.find({ branchId, role: "staff" })
      .select("name username email phone role status branchId createdAt lastEditedBy lastEditedByName lastEditedByRole lastEditedAt")
      .populate("branchId", "name")
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json(users);
  } catch (error) {
    console.error("Branch staff account list error:", error);
    return res.status(500).json({ error: "Unable to load your staff accounts." });
  }
}

export async function createBranchStaff(req, res) {
  const branchId = req.user.branchId?.toString();
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    return res.status(400).json({ error: "Your account is not assigned to a branch." });
  }
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!name) return res.status(400).json({ error: "Enter the staff member's name." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long." });

  try {
    if (!(await Branch.exists({ _id: branchId }))) {
      return res.status(400).json({ error: "Your assigned branch was not found." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }
    const user = await User.create({
      name,
      phone,
      email,
      passwordHash: await hashPassword(password),
      role: "staff",
      status: "active",
      branchId,
      ...getEditMetadata(req.user),
    });
    await logActivity(req, {
      action: "create",
      category: "user",
      summary: "Created a staff account.",
      target: { type: "User", id: user._id, label: user.email },
      details: { changedFields: ["name", "phone", "email", "role", "status", "branchId"] },
    });
    await user.populate("branchId", "name");
    return res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      branchId: user.branchId,
      lastEditedBy: user.lastEditedBy,
      lastEditedByName: user.lastEditedByName,
      lastEditedByRole: user.lastEditedByRole,
      lastEditedAt: user.lastEditedAt,
    });
  } catch (error) {
    console.error("Branch staff account creation error:", error);
    return res.status(400).json({ error: "Unable to create this staff account." });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await User.find().select("name username email phone role status office branchId createdAt lastEditedBy lastEditedByName lastEditedByRole lastEditedAt")
      .populate("branchId", "name").sort({ createdAt: -1 }).limit(500);
    const visibleUsers = isSuperAdminAccount(req.user)
      ? users
      : users.filter((user) => !isSuperAdminAccount(user));
    return res.json(visibleUsers.map((user) => ({
      ...user.toObject(),
      isSuperAdmin: isSuperAdminAccount(user),
    })));
  } catch (error) {
    console.error("User list error:", error);
    return res.status(500).json({ error: "Unable to load users." });
  }
}

export async function updateUserContact(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : undefined;
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : undefined;
  if (name === undefined && phone === undefined) return res.status(400).json({ error: "Provide a name or phone number to update." });
  if (name === "") return res.status(400).json({ error: "Name cannot be empty." });
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    const before = target.toObject();
    if (name !== undefined) target.name = name;
    if (phone !== undefined) target.phone = phone;
    Object.assign(target, getEditMetadata(req.user));
    await target.save();
    const changedFields = getChangedFieldNames(before, target, ["name", "phone"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "user",
        summary: "Updated account contact details.",
        target: { type: "User", id: target._id, label: target.email },
        details: { changedFields },
      });
    }
    return res.json({
      id: target._id, name: target.name, phone: target.phone,
      lastEditedBy: target.lastEditedBy,
      lastEditedByName: target.lastEditedByName,
      lastEditedByRole: target.lastEditedByRole,
      lastEditedAt: target.lastEditedAt,
    });
  } catch (error) {
    console.error("User contact update error:", error);
    return res.status(400).json({ error: "Unable to update account contact details." });
  }
}

export async function updateUserBranch(req, res) {
  const branchId = typeof req.body.branchId === "string" ? req.body.branchId : "";
  if (!mongoose.Types.ObjectId.isValid(branchId)) return res.status(400).json({ error: "Select a valid branch." });
  try {
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    const before = target.toObject();
    target.branchId = branch._id;
    Object.assign(target, getEditMetadata(req.user));
    await target.save();
    const changedFields = getChangedFieldNames(before, target, ["branchId"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "user",
        summary: "Changed a user's branch assignment.",
        target: { type: "User", id: target._id, label: target.email },
        details: { changedFields },
      });
    }
    return res.json({
      id: target._id,
      branchId: { _id: branch._id, name: branch.name },
      lastEditedBy: target.lastEditedBy,
      lastEditedByName: target.lastEditedByName,
      lastEditedByRole: target.lastEditedByRole,
      lastEditedAt: target.lastEditedAt,
    });
  } catch (error) {
    console.error("User branch update error:", error);
    return res.status(400).json({ error: "Unable to assign this branch." });
  }
}

export async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!["admin", "branch", "staff"].includes(role)) return res.status(400).json({ error: "Role must be admin, branch, or staff." });
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    const targetIsSuperAdmin = isSuperAdminAccount(target);
    if (targetIsSuperAdmin) {
      return res.status(403).json({ error: "Super Admin status is controlled by the server setting." });
    }
    if ((role === "admin" || target.role === "admin") && !isSuperAdminAccount(req.user)) {
      return res.status(403).json({ error: "Only the Super Admin can create or change Admin accounts." });
    }
    if (role !== "admin" && !target.branchId) return res.status(400).json({ error: "Assign a branch before changing this account to branch or staff." });
    if (target.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (target.status === "active" && adminCount <= 1) return res.status(400).json({ error: "At least one active admin account must remain." });
    }
    const before = target.toObject();
    target.role = role;
    Object.assign(target, getEditMetadata(req.user));
    await target.save();
    const changedFields = getChangedFieldNames(before, target, ["role"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "user",
        summary: "Changed a user's role.",
        target: { type: "User", id: target._id, label: target.email },
        details: { changedFields },
      });
    }
    return res.json({
      id: target._id, name: target.name, email: target.email, role: target.role,
      lastEditedBy: target.lastEditedBy,
      lastEditedByName: target.lastEditedByName,
      lastEditedByRole: target.lastEditedByRole,
      lastEditedAt: target.lastEditedAt,
    });
  } catch (error) {
    console.error("User role update error:", error);
    return res.status(400).json({ error: "Unable to update user role." });
  }
}

export async function updateUserStatus(req, res) {
  const { status } = req.body;
  if (!["active", "disabled"].includes(status)) return res.status(400).json({ error: "Status must be active or disabled." });
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (isSuperAdminAccount(target)) {
      return res.status(403).json({ error: "Super Admin access is controlled by the server setting." });
    }
    if (target.role === "admin" && !isSuperAdminAccount(req.user)) {
      return res.status(403).json({ error: "Only the Super Admin can change Admin account status." });
    }
    if (status === "active" && target.role !== "admin" && !target.branchId) return res.status(400).json({ error: "Assign a branch before activating this account." });
    if (target.role === "admin" && target.status === "active" && status === "disabled") {
      const activeAdminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdminCount <= 1) return res.status(400).json({ error: "At least one active admin account must remain." });
    }
    const before = target.toObject();
    target.status = status;
    Object.assign(target, getEditMetadata(req.user));
    await target.save();
    const changedFields = getChangedFieldNames(before, target, ["status"]);
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "user",
        summary: "Changed a user's status.",
        target: { type: "User", id: target._id, label: target.email },
        details: { changedFields },
      });
    }
    return res.json({
      id: target._id, email: target.email, role: target.role, status: target.status,
      lastEditedBy: target.lastEditedBy,
      lastEditedByName: target.lastEditedByName,
      lastEditedByRole: target.lastEditedByRole,
      lastEditedAt: target.lastEditedAt,
    });
  } catch (error) {
    console.error("User status update error:", error);
    return res.status(400).json({ error: "Unable to update user status." });
  }
}

export async function deleteUser(req, res) {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (isSuperAdminAccount(target)) {
      return res.status(403).json({ error: "Super Admin access is controlled by the server setting." });
    }
    if (target.role === "admin" && !isSuperAdminAccount(req.user)) {
      return res.status(403).json({ error: "Only the Super Admin can delete Admin accounts." });
    }

    const affectedUsers = target.branchId
      ? await User.find({ branchId: target.branchId })
      : [target];
    if (!affectedUsers.some((user) => user._id.equals(target._id))) {
      affectedUsers.push(target);
    }
    const accountIds = affectedUsers.map((user) => user._id);
    if (accountIds.some((id) => id.equals(req.user._id))) {
      return res.status(400).json({
        error: "You cannot delete your own account or its assigned branch.",
      });
    }

    const activeAdminsToDelete = await User.countDocuments({
      _id: { $in: accountIds },
      role: "admin",
      status: "active",
    });
    if (activeAdminsToDelete) {
      const remainingActiveAdmins = await User.countDocuments({
        _id: { $nin: accountIds },
        role: "admin",
        status: "active",
      });
      if (!remainingActiveAdmins) {
        return res.status(400).json({ error: "At least one active admin account must remain." });
      }
    }

    const branch = target.branchId ? await Branch.findById(target.branchId) : null;
    const workers = target.branchId ? await Worker.find({ branchId: target.branchId }) : [];
    await Session.deleteMany({ user: { $in: accountIds } });
    if (target.branchId) {
      await Worker.deleteMany({ branchId: target.branchId });
    }
    await User.deleteMany({ _id: { $in: accountIds } });
    if (target.branchId) {
      await Branch.findByIdAndDelete(target.branchId);
    }
    for (const user of affectedUsers) {
      await logActivity(req, {
        action: "delete",
        category: "user",
        summary: "Deleted a user account.",
        target: { type: "User", id: user._id, label: user.email },
        details: { changedFields: ["name", "email", "phone", "role", "status", "branchId"] },
      });
    }
    for (const worker of workers) {
      await logActivity(req, {
        action: "delete",
        category: "user",
        summary: "Deleted a worker record with its branch.",
        target: { type: "Worker", id: worker._id, label: worker.name },
        details: { changedFields: ["name", "phone", "email", "address", "branchId"] },
      });
    }
    if (branch) {
      await logActivity(req, {
        action: "delete",
        category: "branch",
        summary: "Deleted a branch with its account.",
        target: { type: "Branch", id: branch._id, label: branch.name },
        details: { changedFields: ["name", "address", "phone", "contactEmail"] },
      });
    }

    return res.json({
      id: target._id,
      branchId: target.branchId,
      message: target.branchId
        ? "Branch and related accounts deleted."
        : "Account deleted.",
    });
  } catch (error) {
    console.error("User deletion error:", error);
    return res.status(400).json({ error: "Unable to delete this account." });
  }
}
