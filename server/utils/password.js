// Utility for hashing and comparing passwords using bcrypt
import bcrypt from "bcrypt";

const rounds = 10;

async function hashPassword(plainPassword) {
  const hash = await bcrypt.hash(plainPassword, rounds);
  return hash;
}

async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export { hashPassword, comparePassword };
