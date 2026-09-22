import jwt from "jsonwebtoken";

const JWT_SECRET = "mag initialize pakas .env ani container rani";

function signToken(payload, expiresIn) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
  return token;
}

function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

export { signToken, verifyToken };
