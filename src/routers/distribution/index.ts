import { Router } from "express";
import DistributionController from "../../controllers/distribution.controller";
import AuthMiddleware from "../../middleware/auth.middleware";
const router = Router();

router.use(AuthMiddleware);

router.get("/", DistributionController.listDistribution);

router.post("/", DistributionController.upsertDistribution);

export default router;
