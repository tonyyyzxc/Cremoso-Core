export function requireBranch(req, res, next) {
  if (!req.user?.branchId) {
    return res.status(400).json({ error: "This account is not assigned to a branch." });
  }
  next();
}
