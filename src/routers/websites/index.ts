import { Router } from "express";
import WebsiteController from "../../controllers/website.controller";
import AuthMiddleware from "../../middleware/auth.middleware";

const router = Router();
const websiteController = new WebsiteController();

router.get("/dialer-sync", websiteController.forceSyncDialer);

router.post("/sync-from", AuthMiddleware, WebsiteController.syncFrom);

router.get("/", AuthMiddleware, WebsiteController.listAllWebsite);

router.get("/sync", websiteController.startLeadSync);

router.get(
  "/sync-count/:webId",
  AuthMiddleware,
  WebsiteController.getAvailableLeadsCount
);

router.post("/", AuthMiddleware, WebsiteController.addWebsite);

router.patch("/:id", AuthMiddleware, WebsiteController.updateWebsite);

export default router;
