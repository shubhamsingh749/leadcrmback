import { Router } from "express";
import AuthMiddleware from "../../middleware/auth.middleware";

import ReportController from "../../controllers/report.controller";
import TwoFactorMiddleware from "../../middleware/twofa.middleware";

const router = Router();

router.use(AuthMiddleware);

router.get("/", ReportController.generateReport);

router.get("/dashboard-report", ReportController.generateDashboardReport);

router.post(
  "/download-data",
  TwoFactorMiddleware,
  ReportController.downloadLeads
);

router.delete(
  "/remove-data",
  TwoFactorMiddleware,
  ReportController.deleteLeads
);

export default router;
