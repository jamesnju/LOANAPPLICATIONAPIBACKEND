import { Router } from "express";
import { register, verifyAccount, login, refreshToken, logout, } from "../controllers/auth.controller.js";
const router = Router();
router.post("/register", register);
router.post("/verify", verifyAccount);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
export default router;
//# sourceMappingURL=auth.routes.js.map