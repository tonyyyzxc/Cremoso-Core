import Branch from "../models/branch.js";
import BranchApplication from "../models/branchApplication.js";
import User from "../models/user.js";
import { hashPassword } from "../utils/password.js";

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function submitBranchApplication(req, res) {
  const branchName = typeof req.body.branchName === "string" ? req.body.branchName.trim() : "";
  const branchAddress = typeof req.body.branchAddress === "string" ? req.body.branchAddress.trim() : "";
  const branchPhone = typeof req.body.branchPhone === "string" ? req.body.branchPhone.trim() : "";
  const managerName = typeof req.body.managerName === "string" ? req.body.managerName.trim() : "";
  const managerPhone = typeof req.body.managerPhone === "string" ? req.body.managerPhone.trim() : "";
  const managerEmail = typeof req.body.managerEmail === "string" ? req.body.managerEmail.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!branchName || !managerName) return res.status(400).json({ error: "Branch and manager names are required." });
  if (!validEmail(managerEmail)) return res.status(400).json({ error: "Enter a valid manager email address." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long." });

  try {
    if (await User.exists({ email: managerEmail })) {
      return res.status(409).json({ error: "An account with this manager email already exists." });
    }
    if (await Branch.exists({ name: branchName })) {
      return res.status(409).json({ error: "A branch with this name already exists." });
    }
    const duplicateApplication = await BranchApplication.exists({
      status: "pending",
      $or: [{ managerEmail }, { branchName: { $regex: `^${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }],
    });
    if (duplicateApplication) {
      return res.status(409).json({ error: "A pending application already uses this branch name or manager email." });
    }

    await BranchApplication.create({
      branchName,
      branchAddress,
      branchPhone,
      managerName,
      managerPhone,
      managerEmail,
      managerPasswordHash: await hashPassword(password),
    });
    return res.status(201).json({ message: "Application submitted. The branch manager can sign in after admin approval." });
  } catch (error) {
    console.error("Branch application submission error:", error);
    return res.status(400).json({ error: "Unable to submit this branch application." });
  }
}

export async function listBranchApplications(_req, res) {
  try {
    const applications = await BranchApplication.find()
      .select("branchName branchAddress branchPhone managerName managerPhone managerEmail status hiddenAt reviewedAt createdAt")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    return res.json(applications);
  } catch (error) {
    console.error("Branch application list error:", error);
    return res.status(500).json({ error: "Unable to load branch applications." });
  }
}

export async function setBranchApplicationVisibility(req, res) {
  if (typeof req.body.hidden !== "boolean") {
    return res.status(400).json({ error: "Hidden must be a boolean value." });
  }

  try {
    const application = await BranchApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ error: "Branch application not found." });

    application.hiddenAt = req.body.hidden ? new Date() : null;
    await application.save();
    return res.json({ id: application._id, hiddenAt: application.hiddenAt });
  } catch (error) {
    console.error("Branch application visibility error:", error);
    return res.status(500).json({ error: "Unable to update branch application visibility." });
  }
}

export async function deleteBranchApplication(req, res) {
  try {
    const application = await BranchApplication.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ error: "Branch application not found." });
    return res.json({ id: application._id });
  } catch (error) {
    console.error("Branch application deletion error:", error);
    return res.status(500).json({ error: "Unable to delete branch application." });
  }
}

export async function reviewBranchApplication(req, res) {
  const { decision } = req.body;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be approved or rejected." });
  }

  let branch;
  let user;
  try {
    const application = await BranchApplication.findById(req.params.id).select("+managerPasswordHash");
    if (!application) return res.status(404).json({ error: "Branch application not found." });
    if (application.status !== "pending") return res.status(409).json({ error: "This application has already been reviewed." });

    if (decision === "approved") {
      if (!application.managerPasswordHash) {
        return res.status(400).json({ error: "This application has no manager password available." });
      }
      if (await User.exists({ email: application.managerEmail })) {
        return res.status(409).json({ error: "A user account already uses the manager email." });
      }
      branch = await Branch.create({
        name: application.branchName,
        address: application.branchAddress,
        phone: application.branchPhone,
        contactEmail: application.managerEmail,
      });
      user = await User.create({
        name: application.managerName,
        phone: application.managerPhone,
        email: application.managerEmail,
        passwordHash: application.managerPasswordHash,
        role: "branch",
        status: "active",
        branchId: branch._id,
      });
    }

    application.status = decision;
    application.managerPasswordHash = null;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;
    await application.save();
    return res.json({
      id: application._id,
      status: application.status,
      reviewedAt: application.reviewedAt,
      branch: branch ? { _id: branch._id, name: branch.name } : null,
      user: user ? { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, branchId: branch._id } : null,
    });
  } catch (error) {
    if (user) await User.findByIdAndDelete(user._id).catch(() => {});
    if (branch) await Branch.findByIdAndDelete(branch._id).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ error: "The branch name or manager email is already in use." });
    console.error("Branch application review error:", error);
    return res.status(400).json({ error: "Unable to review this branch application." });
  }
}
