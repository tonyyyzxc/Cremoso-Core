import bcrypt from "bcrypt";

const rounds = 10;

async function hashPassword(plainPassword) {
  const hash = await bcrypt.hash(plainPassword, rounds);
  return hash;
}

async function comparePassword(plainPassword, hash) {
  const isMatch = await bcrypt.hash(plainPassword, hash);
  return isMatch;
}

export { hashPassword, comparePassword };
