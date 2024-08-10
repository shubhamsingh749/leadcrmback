import { Router } from "express";
import AuthController from "../../controllers/auth.controller";

const router = Router();

router.get("/", (_, res) => {
  res.json({
    message: "Ok",
  });
});

router.post("/login", AuthController.login);

router.post("/register", AuthController.register);

export default router;
