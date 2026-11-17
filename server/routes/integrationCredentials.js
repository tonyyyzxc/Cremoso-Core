import express from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  getIntegrationCredentialStatus,
  removeIntegrationCredentials,
  validateAndSaveIntegrationCredentials,
  requestIntegrationCredentialCode,
  verifyIntegrationCredentialCode,
} from "../controllers/integrationCredentialsController.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);
router.get("/", getIntegrationCredentialStatus);
router.post("/challenge", requestIntegrationCredentialCode);
router.post("/challenge/verify", verifyIntegrationCredentialCode);
router.post(
  "/:integration/validate",
  requireEditLock("IntegrationCredential", (req) => req.params.integration),
  validateAndSaveIntegrationCredentials,
);
router.delete(
  "/:integration",
  requireEditLock("IntegrationCredential", (req) => req.params.integration),
  removeIntegrationCredentials,
);

export default router;
