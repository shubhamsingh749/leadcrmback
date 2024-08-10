import { Router } from "express";
import LeadController from "../../controllers/lead.controller";
import AuthMiddleware, {
  LowKeyAuthMiddleware,
} from "../../middleware/auth.middleware";

const router = Router();

// Protect below routes with query token
router.get("/", LowKeyAuthMiddleware, LeadController.listLeads);

// Protect below routes with authorization token
router.use(AuthMiddleware);
router.post("/", LeadController.addLeads);

export default router;
