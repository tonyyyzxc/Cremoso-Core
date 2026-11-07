import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.js";
import Session from "../models/session.js";
import { isSuperAdminAccount } from "../utils/superAdmin.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  let decoded;
  try {
    decoded = verifyToken(authHeader.split(" ")[1]);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const session = await Session.findOne({
      tokenId: decoded.sid,
      user: decoded.id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      return res.status(401).json({ error: "Session has ended. Please sign in again." });
    }
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Account is unavailable" });
    }
    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    console.error("Authentication lookup failed:", err);
    return res.status(500).json({ error: "Unable to verify this session" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do this" });
    }
    next();
  };
}

export function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminAccount(req.user)) {
    return res.status(403).json({ error: "Only the Super Admin can manage integration credentials." });
  }
  next();
}
