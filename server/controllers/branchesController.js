import Branch from "../models/branch.js";
import User from "../models/user.js";
import Worker from "../models/Worker.js";
import { hashPassword } from "../utils/password.js";

const branchFields = (body) => ({
  name: typeof body.name === "string" ? body.name.trim() : "",
  address: typeof body.address === "string" ? body.address.trim() : "",
  phone: typeof body.phone === "string" ? body.phone.trim() : "",
  contactEmail: typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "",
});

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validContactEmail = (email) => !email || validEmail(email);

export async function listBranches(_req, res) {
  try {
    return res.json(await Branch.find().sort({ name: 1 }));
  } catch (error) {
    console.error("Branch list error:", error);
    return res.status(500).json({ error: "Unable to load branches." });
  }
}

export async function listWorkers(_req, res) {
  try {
    const workers = await Worker.find().populate("branchId", "name").sort({ name: 1 });
    return res.json(workers);
  } catch (error) {
    console.error("Worker list error:", error);
    return res.status(500).json({ error: "Unable to load workers." });
  }
}

export async function createBranchAccount(req, res) {
  const fields = branchFields(req.body);
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!fields.name) return res.status(400).json({ error: "Branch name is required." });
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long." });
  fields.contactEmail = email;

  let branch;
  try {
    if (await User.findOne({ email })) return res.status(409).json({ error: "An account with this email address already exists." });
    branch = await Branch.create(fields);
    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      role: "staff",
      status: "active",
      branchId: branch._id,
    });
    return res.status(201).json({
      branch,
      user: {
        _id: user._id, name: user.name, phone: user.phone, email: user.email,
        role: user.role, status: user.status, branchId: { _id: branch._id, name: branch.name },
      },
    });
  } catch (error) {
    if (branch) await Branch.findByIdAndDelete(branch._id).catch(() => {});
    if (error.code === 11000) {
      return res.status(409).json({ error: branch ? "An account with this email address already exists." : "A branch with this name already exists." });
    }
    console.error("Branch account creation error:", error);
    return res.status(400).json({ error: "Unable to create this branch account." });
  }
}

export async function createBranch(req, res) {
  const fields = branchFields(req.body);
  if (!fields.name) return res.status(400).json({ error: "Branch name is required." });
  if (!validContactEmail(fields.contactEmail)) return res.status(400).json({ error: "Enter a valid branch contact email." });
  try {
    return res.status(201).json(await Branch.create(fields));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "A branch with this name already exists." });
    console.error("Branch creation error:", error);
    return res.status(400).json({ error: "Unable to create branch." });
  }
}

export async function updateBranch(req, res) {
  const fields = branchFields(req.body);
  if (!fields.name) return res.status(400).json({ error: "Branch name is required." });
  if (!validContactEmail(fields.contactEmail)) return res.status(400).json({ error: "Enter a valid branch contact email." });
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    Object.assign(branch, fields);
    await branch.save();
    return res.json(branch);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "A branch with this name already exists." });
    console.error("Branch update error:", error);
    return res.status(400).json({ error: "Unable to update branch." });
  }
}
