import { verifyToken } from "../utils/jwt";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = verifyToken(authHeader.split("")[1]);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
