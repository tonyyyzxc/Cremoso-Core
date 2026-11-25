import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const redisClient = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;
let redisStoreIndex = 0;

if (redisClient) {
  redisClient.on("error", (error) => {
    console.error("Redis rate-limit store error:", error.message);
  });
}

// Initialize the Redis-backed store used by API rate limiters.
export async function connectRateLimitStore() {
  if (!redisClient) return;
  await redisClient.connect();
  console.log("Redis rate-limit store online.");
}

// Create a configurable Express rate limiter.
function createLimiter({
  windowMs,
  limit,
  message,
  keyGenerator,
}) {
  // Redis is an optional deployment optimization; local development keeps the in-memory store.
  const store = redisClient
    ? new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: `cremoso:rate-limit:${redisStoreIndex++}:`,
    })
    : undefined;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(store ? { store } : {}),
    handler(req, res) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          ((req.rateLimit?.resetTime?.getTime() || Date.now() + windowMs)
            - Date.now()) / 1000,
        ),
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: message,
        retryAfterSeconds,
      });
    },
  });
}

// Create an IP-based limiter for a route or request scope.
const createIpLimiter = (options) => createLimiter(options);
// Create an account-based limiter for authenticated requests.
const createAccountLimiter = (options) => createLimiter({
  ...options,
  keyGenerator: (req) => "user:" + req.user._id.toString(),
});

export const loginRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  message: "Too many sign-in attempts. Try again later.",
});

export const googleLoginRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 20,
  message: "Too many Google sign-in attempts. Try again later.",
});

export const passwordResetRequestRateLimit = createIpLimiter({
  windowMs: ONE_HOUR_MS,
  limit: 5,
  message: "Too many password reset requests. Try again later.",
});

export const passwordResetVerifyRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  message: "Too many password reset code attempts. Try again later.",
});

export const passwordResetCompletionRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  message: "Too many password reset attempts. Try again later.",
});

export const credentialChallengeIpRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  message: "Too many verification code requests. Try again later.",
});

export const credentialChallengeAccountRateLimit = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  message: "Too many verification code requests for this account. Try again later.",
});

export const credentialVerifyIpRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  message: "Too many verification attempts. Try again later.",
});

export const credentialVerifyAccountRateLimit = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  message: "Too many verification attempts for this account. Try again later.",
});

export const credentialValidationIpRateLimit = createIpLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  message: "Too many credential validation attempts. Try again later.",
});

export const credentialValidationAccountRateLimit = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  message: "Too many credential validation attempts for this account. Try again later.",
});

export const refreshIpRateLimit = createIpLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  message: "Too many refresh requests. Try again shortly.",
});

export const refreshAccountRateLimit = createAccountLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 60,
  message: "Too many refresh requests for this account. Try again shortly.",
});

export const externalActionIpRateLimit = createIpLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 30,
  message: "Too many integration requests. Try again shortly.",
});

export const externalActionAccountRateLimit = createAccountLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 15,
  message: "Too many integration requests for this account. Try again shortly.",
});

export const uploadIpRateLimit = createIpLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  message: "Too many upload requests. Try again shortly.",
});

export const uploadAccountRateLimit = createAccountLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 5,
  message: "Too many upload requests for this account. Try again shortly.",
});

export const apiIpRateLimit = createIpLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: 600,
  message: "Too many API requests. Try again shortly.",
});
