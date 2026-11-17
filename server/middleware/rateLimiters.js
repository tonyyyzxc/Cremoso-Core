import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function createLimiter({
  windowMs,
  limit,
  message,
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
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

const createIpLimiter = (options) => createLimiter(options);
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
