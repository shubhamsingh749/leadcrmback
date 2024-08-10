import { Router } from "express";
import AuthMiddleware from "../../middleware/auth.middleware";
import SettingsController from "../../controllers/settings.controller";
import TwoFactorMiddleware from "../../middleware/twofa.middleware";

const router = Router();

router.use(AuthMiddleware);

router.post(
  "/generate-twofa-qr",
  TwoFactorMiddleware,
  SettingsController.generateTwoFactorAuthQR
);

router.post("/save-twofa-qr", SettingsController.saveTwoFactorAuthQR);

router.get("/:id?", SettingsController.getSetting);

router.post("/:id", SettingsController.upsertSetting);

export default router;
