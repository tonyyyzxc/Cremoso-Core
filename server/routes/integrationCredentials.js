import express from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
  getIntegrationCredentialStatus,
  removeIntegrationCredentials,
  replaceIntegrationCredentials,
  requestIntegrationCredentialCode,
} from "../controllers/integrationCredentialsController.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);
router.get("/", getIntegrationCredentialStatus);
router.post("/challenge", requestIntegrationCredentialCode);
router.put("/:integration", replaceIntegrationCredentials);
router.delete("/:integration", removeIntegrationCredentials);

export default router;
