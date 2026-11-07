import AuthConfig from "../models/authConfig.js";

export async function isIntegrationEnabled(setting) {
  const config = await AuthConfig.findOne({ key: "default" }).select(setting);
  return config?.[setting] !== false;
}

export async function requireIntegration(setting, res, label) {
  if (await isIntegrationEnabled(setting)) return true;
  res.status(503).json({ error: `${label} is disabled by an administrator.` });
  return false;
}
