import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Session from "../models/session.js";
import User from "../models/user.js";
import Worker from "../models/Worker.js";
import { hashPassword } from "../utils/password.js";

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
  if (!["admin", "staff"].includes(role)) return res.status(400).json({ error: "Role must be admin or staff." });
  if (role === "admin" && !name) return res.status(400).json({ error: "Enter the admin's name." });
  if (role === "staff" && !name) return res.status(400).json({ error: "Enter the staff member's name." });
  if (role === "staff" && !mongoose.Types.ObjectId.isValid(branchId)) return res.status(400).json({ error: "Select a branch for this staff account." });
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
    });
    await user.populate("branchId", "name");
    return res.status(201).json({
      _id: user._id, name: user.name, phone: user.phone, email: user.email,
      role: user.role, status: user.status, branchId: user.branchId,
    });
  } catch (error) {
    console.error("Account creation error:", error);
    return res.status(400).json({ error: "Unable to create this account." });
  }
}

export async function listUsers(_req, res) {
  try {
    const users = await User.find().select("name username email phone role status office branchId createdAt")
      .populate("branchId", "name").sort({ createdAt: -1 });
    return res.json(users);
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
    if (name !== undefined) target.name = name;
    if (phone !== undefined) target.phone = phone;
    await target.save();
    return res.json({ id: target._id, name: target.name, phone: target.phone });
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
    target.branchId = branch._id;
    await target.save();
    return res.json({ id: target._id, branchId: { _id: branch._id, name: branch.name } });
  } catch (error) {
    console.error("User branch update error:", error);
    return res.status(400).json({ error: "Unable to assign this branch." });
  }
}

export async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!["admin", "staff"].includes(role)) return res.status(400).json({ error: "Role must be admin or staff." });
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (role === "staff" && !target.branchId) return res.status(400).json({ error: "Assign a branch before changing this account to staff." });
    if (target.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (target.status === "active" && adminCount <= 1) return res.status(400).json({ error: "At least one active admin account must remain." });
    }
    target.role = role;
    await target.save();
    return res.json({ id: target._id, name: target.name, email: target.email, role: target.role });
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
    if (status === "active" && target.role === "staff" && !target.branchId) return res.status(400).json({ error: "Assign a branch before activating this staff account." });
    if (target.role === "admin" && target.status === "active" && status === "disabled") {
      const activeAdminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdminCount <= 1) return res.status(400).json({ error: "At least one active admin account must remain." });
    }
    target.status = status;
    await target.save();
    return res.json({ id: target._id, email: target.email, role: target.role, status: target.status });
  } catch (error) {
    console.error("User status update error:", error);
    return res.status(400).json({ error: "Unable to update user status." });
  }
}

export async function deleteUser(req, res) {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    const accountIds = target.branchId
      ? await User.find({ branchId: target.branchId }).distinct("_id")
      : [target._id];
    if (!accountIds.some((id) => id.equals(target._id))) {
      accountIds.push(target._id);
    }
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

    await Session.deleteMany({ user: { $in: accountIds } });
    if (target.branchId) {
      await Worker.deleteMany({ branchId: target.branchId });
    }
    await User.deleteMany({ _id: { $in: accountIds } });
    if (target.branchId) {
      await Branch.findByIdAndDelete(target.branchId);
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
