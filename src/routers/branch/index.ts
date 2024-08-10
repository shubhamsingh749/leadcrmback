import { Router } from "express";
import BranchController from "../../controllers/branch.controller";
import AuthMiddleware from "../../middleware/auth.middleware";

const router = Router();

router.use(AuthMiddleware);

router.get("/", BranchController.listAllBranches);

router.post("/create-branch", BranchController.addBranch);

router.patch("/update-branch/:id", BranchController.updateBranch);

router.delete("/:id", BranchController.deleteBranch);

export default router;
