import express from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  credentialChallengeAccountRateLimit,
  credentialChallengeIpRateLimit,
  credentialValidationAccountRateLimit,
  credentialValidationIpRateLimit,
  credentialVerifyAccountRateLimit,
  credentialVerifyIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  getIntegrationCredentialStatus,
  removeIntegrationCredentials,
  validateAndSaveIntegrationCredentials,
  requestIntegrationCredentialCode,
  verifyIntegrationCredentialCode,
} from "../controllers/integrationCredentialsController.js";

const router = express.Router();
// Super Admin routes manage integration credential status and verification.

router.use(requireAuth, requireSuperAdmin);
router.get("/", getIntegrationCredentialStatus);
router.post(
  "/challenge",
  credentialChallengeIpRateLimit,
  credentialChallengeAccountRateLimit,
  requestIntegrationCredentialCode,
);
router.post(
  "/challenge/verify",
  credentialVerifyIpRateLimit,
  credentialVerifyAccountRateLimit,
  verifyIntegrationCredentialCode,
);
router.post(
  "/:integration/validate",
  credentialValidationIpRateLimit,
  credentialValidationAccountRateLimit,
  requireEditLock("IntegrationCredential", (req) => req.params.integration),
  validateAndSaveIntegrationCredentials,
);
router.delete(
  "/:integration",
  requireEditLock("IntegrationCredential", (req) => req.params.integration),
  removeIntegrationCredentials,
);

export default router;
