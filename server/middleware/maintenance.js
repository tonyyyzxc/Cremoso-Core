const DEFAULT_MESSAGE = "We're performing maintenance. Please try again soon.";
const DEFAULT_RETRY_AFTER_SECONDS = 300;

export default function maintenance(req, res, next) {
  if (req.path === "/health" || process.env.MAINTENANCE_MODE !== "true") {
    return next();
  }

  const bypassKey = process.env.MAINTENANCE_BYPASS_KEY;
  if (bypassKey && req.get("x-maintenance-bypass") === bypassKey) {
    return next();
  }

  const retryAfterSeconds = Number.parseInt(
    process.env.MAINTENANCE_RETRY_AFTER_SECONDS,
    10,
  );

  res.set("Retry-After", String(
    Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds
      : DEFAULT_RETRY_AFTER_SECONDS,
  ));

  return res.status(503).json({
    maintenance: true,
    message: process.env.MAINTENANCE_MESSAGE || DEFAULT_MESSAGE,
  });
}
