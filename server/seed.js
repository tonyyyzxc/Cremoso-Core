// Seeds the database with an admin account and branch accounts that have hashed passwords.
// Safe to run more than once: accounts are matched by email and updated, so running it
// again also resets that account's password. Existing branches are left untouched.
//
// Run from the server folder:
//   node --env-file=.env seed.js
import mongoose from "mongoose";
import Branch from "./models/branch.js";
import User from "./models/user.js";
import { hashPassword } from "./utils/password.js";

// Edit these before running. Do not commit real passwords.
const admin = {
  name: env("ADMIN_NAME"),
  email: "admin@gmail.com",
  password: "password",
};

// No branch accounts are seeded.
const branchAccounts = [];

const checkPassword = (label, password) => {
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
  user.passwordHash = await hashPassword(password);
  await user.save();
  return user;
};

async function main() {
  if (!process.env.MONGODB_URL) {
    throw new Error(
      "MONGODB_URL is not set. Add it to server/.env or rename it in seed.js to match your .env.",
    );
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
