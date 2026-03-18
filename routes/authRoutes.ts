import express, { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router: Router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);

export default router;

