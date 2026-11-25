// Seeds the database with the designated Super Admin and optional branch accounts.
// Accounts are matched by email. A supplied password is hashed and updated; when no
// password is supplied, an existing password is preserved and new accounts stay passwordless.
//
// Run from the server folder:
//   node --env-file=.env seed.js
import "./config.js";
import mongoose from "mongoose";
import Branch from "./models/branch.js";
import User from "./models/user.js";
import { hashPassword } from "./utils/password.js";

const admin = {
  name: process.env.ADMIN_DEV?.trim() || "",
  email: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || "",
  password: process.env.SUPER_ADMIN_PASS || "",
};

// No branch accounts are seeded.
const branchAccounts = [];

const checkPassword = (label, password) => {
  if (!password) return;
  if (password.startsWith("CHANGE_ME")) {
    throw new Error(
      `Set a real password for ${label} before running the seed.`,
    );
  }
  if (password.length < 8) {
    throw new Error(
      `The password for ${label} must be at least 8 characters long.`,
    );
  }
};

const upsertUser = async ({ email, password, ...fields }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user =
    (await User.findOne({ email: normalizedEmail })) ||
    new User({ email: normalizedEmail });
  Object.assign(user, fields);
  if (password) user.passwordHash = await hashPassword(password);
  await user.save();
  return user;
};

async function main() {
  if (!process.env.MONGODB_URL) {
    throw new Error(
      "MONGODB_URL is not set. Add it to server/.env or rename it in seed.js to match your .env.",
    );
  }
  if (!admin.name) {
    throw new Error("ADMIN_DEV is not set.");
  }
  if (!admin.email) {
    throw new Error("SUPER_ADMIN_EMAIL is not set.");
  }
  checkPassword(admin.email, admin.password);
  branchAccounts.forEach((account) =>
    checkPassword(account.email, account.password),
  );

  await mongoose.connect(process.env.MONGODB_URL);

  await upsertUser({ ...admin, role: "admin", status: "active" });
  console.log(`Admin ready: ${admin.email}`);

  for (const account of branchAccounts) {
    const branch =
      (await Branch.findOne({ name: account.branchName })) ||
      (await Branch.create({
        name: account.branchName,
        address: account.address,
        phone: account.phone,
        contactEmail: account.contactEmail,
      }));
    await upsertUser({
      email: account.email,
      password: account.password,
      role: "branch",
      status: "active",
      branchId: branch._id,
    });
    console.log(`Branch account ready: ${account.email} (${branch.name})`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
// Seed the database with initial users and branch data.
