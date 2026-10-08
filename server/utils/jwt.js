import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload, expiresIn) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
  return token;
}

function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

export { signToken, verifyToken };
