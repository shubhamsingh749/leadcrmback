import { Router } from "express";
import ProductController from "../../controllers/product.controller";
import AuthMiddleware from "../../middleware/auth.middleware";

const router = Router();
router.use(AuthMiddleware);

router.get("/", ProductController.listAllProduct);

router.post("/", ProductController.addProduct);

router.patch("/:id", ProductController.updateProduct);

router.delete("/:id", ProductController.deleteProduct);

export default router;
